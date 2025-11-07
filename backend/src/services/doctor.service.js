import prisma from '../config/prisma.js';
import * as geoUtils from '../utils/geo.js';

class DoctorService {
  // Search doctors by specialty, location, and filters
  async searchDoctors(filters) {
    const {
      specialty,
      lat,
      lon,
      visitType = 'CLINIC',
      sortBy = 'distance',
      maxDistance = 50, // km
      minRating = 0,
      limit = 20
    } = filters;

    console.log('DoctorService.searchDoctors called with filters:', filters);

    // Build query - temporarily remove verification requirement for testing
    const where = {
      // verifiedStatus: 'VERIFIED', // Commented out for testing
      ...(specialty && { specialties: { has: specialty } }),
      ...(minRating > 0 && { rating: { gte: minRating } })
    };

    console.log('Database query where clause:', where);

    // Get all doctors with clinics
    const doctors = await prisma.doctor.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            language: true,
            email: true
          }
        },
        clinics: true,
        schedules: {
          where: {
            startTs: { gte: new Date() },
            type: 'work'
          },
          orderBy: { startTs: 'asc' },
          take: 10
        }
      }
    });

    console.log(`Found ${doctors.length} doctors in database`);

    // Calculate distance and filter by location if provided
    let results = doctors.map(doctor => {
      const clinicsWithDistance = doctor.clinics.map(clinic => {
        let distance = null;
        if (lat && lon && clinic.lat && clinic.lon) {
          try {
            distance = geoUtils.haversineDistance(lat, lon, clinic.lat, clinic.lon);
          } catch (error) {
            console.error('Distance calculation error:', error);
            distance = null;
          }
        }
        return { ...clinic, distance };
      }).filter(clinic => {
        if (!lat || !lon) return true;
        if (clinic.distance === null) return true;
        return clinic.distance <= maxDistance;
      });

      if (clinicsWithDistance.length === 0) return null;

      // Find next available slot
      const nextSlots = this.getNextAvailableSlots(doctor.schedules, 3);

      return {
        doctorId: doctor.id,
        userId: doctor.user_id,
        specialties: doctor.specialties,
        rating: doctor.rating,
        avgConsultMin: doctor.avgConsultMin,
        clinics: clinicsWithDistance,
        nearestClinic: clinicsWithDistance[0],
        nextSlots,
        nextAvailable: nextSlots[0]?.startTs || null
      };
    }).filter(Boolean);

    // Sort results
    if (sortBy === 'distance' && lat && lon) {
      results.sort((a, b) => {
        const distA = a.nearestClinic?.distance || 999;
        const distB = b.nearestClinic?.distance || 999;
        return distA - distB;
      });
    } else if (sortBy === 'next_available') {
      results.sort((a, b) => {
        if (!a.nextAvailable) return 1;
        if (!b.nextAvailable) return -1;
        return new Date(a.nextAvailable) - new Date(b.nextAvailable);
      });
    } else if (sortBy === 'rating') {
      results.sort((a, b) => b.rating - a.rating);
    }

    const finalResults = results.slice(0, limit);
    console.log(`Returning ${finalResults.length} doctors`);
    return finalResults;
  }

  // Get doctor availability for a specific date
  async getDoctorAvailability(doctorId, clinicId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get work schedule blocks
    const scheduleBlocks = await prisma.scheduleBlock.findMany({
      where: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        type: 'work',
        startTs: { gte: startOfDay },
        endTs: { lte: endOfDay }
      },
      orderBy: { startTs: 'asc' }
    });

    // Get existing appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        startTs: { gte: startOfDay, lte: endOfDay },
        status: { in: ['CONFIRMED', 'STARTED'] }
      }
    });

    // Get active slot holds
    const holds = await prisma.slotHold.findMany({
      where: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        startTs: { gte: startOfDay, lte: endOfDay },
        status: 'active',
        ttlExpiresAt: { gte: new Date() }
      }
    });

    // Generate available slots
    const slots = [];
    const bookedTimes = new Set([
      ...appointments.map(a => a.startTs.toISOString()),
      ...holds.map(h => h.startTs.toISOString())
    ]);

    for (const block of scheduleBlocks) {
      let currentTime = new Date(block.startTs);
      const blockEnd = new Date(block.endTs);
      const slotDuration = block.slotMinutes * 60 * 1000;

      while (currentTime < blockEnd) {
        const slotEnd = new Date(currentTime.getTime() + slotDuration);
        if (slotEnd <= blockEnd && !bookedTimes.has(currentTime.toISOString())) {
          slots.push({
            startTs: new Date(currentTime),
            endTs: slotEnd,
            available: true
          });
        }
        currentTime = new Date(currentTime.getTime() + slotDuration + (block.bufferMinutes * 60 * 1000));
      }
    }

    return {
      date,
      doctorId,
      clinicId,
      totalSlots: slots.length,
      availableSlots: slots,
      bookedCount: appointments.length
    };
  }

  // Helper to get next N available slots from schedule blocks
  getNextAvailableSlots(schedules, count = 3) {
    const now = new Date();
    const slots = [];

    for (const block of schedules) {
      if (new Date(block.startTs) > now) {
        slots.push({
          startTs: block.startTs,
          endTs: new Date(new Date(block.startTs).getTime() + block.slotMinutes * 60 * 1000),
          clinicId: block.clinic_id
        });
        if (slots.length >= count) break;
      }
    }

    return slots;
  }

  // Get doctor profile with statistics
  async getDoctorProfile(doctorId) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: true,
        clinics: true,
        appointments: {
          where: {
            status: 'COMPLETED'
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    // Calculate statistics
    const totalAppointments = await prisma.appointment.count({
      where: { doctor_id: doctorId, status: 'COMPLETED' }
    });

    const noShows = await prisma.appointment.count({
      where: { doctor_id: doctorId, status: 'CANCELLED' }
    });

    return {
      ...doctor,
      statistics: {
        totalAppointments,
        noShows,
        noShowRate: totalAppointments > 0 ? (noShows / totalAppointments * 100).toFixed(2) : 0
      }
    };
  }
}

export default new DoctorService();

