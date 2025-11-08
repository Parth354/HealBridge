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

      // Get doctor name from Doctor model (firstName/lastName) or fallback to user email
      const doctorName = (doctor.firstName && doctor.lastName) 
        ? `${doctor.firstName} ${doctor.lastName}`.trim()
        : (doctor.firstName || doctor.lastName || doctor.user?.email?.split('@')[0] || 'Dr. Unknown');
      
      return {
        doctorId: doctor.id,
        userId: doctor.user_id,
        firstName: doctor.firstName || '',
        lastName: doctor.lastName || '',
        name: doctorName,
        specialties: doctor.specialties,
        rating: doctor.rating,
        avgConsultMin: doctor.avgConsultMin,
        clinics: clinicsWithDistance,
        nearestClinic: clinicsWithDistance[0],
        nextSlots,
        nextAvailable: nextSlots[0]?.startTs || null,
        user: doctor.user ? {
          email: doctor.user.email || '',
          phone: doctor.user.phone || '',
          language: doctor.user.language || 'en'
        } : null
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
    try {
      // Validate inputs
      if (!doctorId || !clinicId || !date) {
        throw new Error('Doctor ID, Clinic ID, and date are required');
      }

      // Verify doctor exists
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId }
      });

      if (!doctor) {
        throw new Error(`Doctor with ID ${doctorId} not found`);
      }

      // Verify clinic exists and belongs to doctor
      const clinic = await prisma.clinic.findFirst({
        where: {
          id: clinicId,
          doctor_id: doctorId
        }
      });

      if (!clinic) {
        throw new Error(`Clinic with ID ${clinicId} not found for doctor ${doctorId}`);
      }

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

      console.log(`Found ${scheduleBlocks.length} schedule blocks for doctor ${doctorId} at clinic ${clinicId} on ${date}`);

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

      const now = new Date();

      for (const block of scheduleBlocks) {
        let currentTime = new Date(block.startTs);
        const blockEnd = new Date(block.endTs);
        const slotDuration = block.slotMinutes * 60 * 1000;

        while (currentTime < blockEnd) {
          const slotEnd = new Date(currentTime.getTime() + slotDuration);
          
          // Only include slots that:
          // 1. Fit within the block
          // 2. Are not booked
          // 3. Are not in the past
          if (slotEnd <= blockEnd && 
              !bookedTimes.has(currentTime.toISOString()) && 
              currentTime > now) {
            slots.push({
              startTs: currentTime.toISOString(),
              endTs: slotEnd.toISOString(),
              available: true
            });
          }
          currentTime = new Date(currentTime.getTime() + slotDuration + (block.bufferMinutes * 60 * 1000));
        }
      }

      console.log(`Generated ${slots.length} available slots (${appointments.length} booked, ${holds.length} held)`);

      return {
        date,
        doctorId,
        clinicId,
        totalSlots: slots.length,
        availableSlots: slots,
        bookedCount: appointments.length,
        hasScheduleBlocks: scheduleBlocks.length > 0
      };
    } catch (error) {
      console.error('Error in getDoctorAvailability:', error);
      throw error;
    }
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

