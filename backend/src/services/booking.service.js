import prisma from '../config/prisma.js';
import redisClient from '../config/redis.js';
import { v4 as uuidv4 } from 'uuid';
import notificationService from './notification.service.js';

class BookingService {
  constructor() {
    this.SLOT_HOLD_TTL = 120; // 2 minutes
  }

  // Create a slot hold (temporary reservation)
  async createSlotHold(data) {
    const { doctorId, clinicId, patientId, startTs, endTs } = data;

    // Check if slot is already booked or held
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        doctor_id: doctorId,
        startTs: new Date(startTs),
        status: { in: ['CONFIRMED', 'STARTED'] }
      }
    });

    if (existingAppointment) {
      throw new Error('Slot is already booked');
    }

    const existingHold = await prisma.slotHold.findFirst({
      where: {
        doctor_id: doctorId,
        startTs: new Date(startTs),
        status: 'active',
        ttlExpiresAt: { gte: new Date() }
      }
    });

    if (existingHold) {
      throw new Error('Slot is currently held by another user');
    }

    // Create slot hold
    const ttlExpiresAt = new Date(Date.now() + this.SLOT_HOLD_TTL * 1000);
    
    const hold = await prisma.slotHold.create({
      data: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        patient_id: patientId,
        startTs: new Date(startTs),
        endTs: new Date(endTs),
        ttlExpiresAt,
        status: 'active'
      }
    });

    // Set Redis key for auto-cleanup
    await redisClient.setEx(`hold:${hold.id}`, this.SLOT_HOLD_TTL, 'active');

    return {
      holdId: hold.id,
      expiresAt: ttlExpiresAt,
      expiresInSeconds: this.SLOT_HOLD_TTL
    };
  }

  // Convert slot hold to appointment
  async confirmAppointment(data) {
    const { holdId, patientId, visitType, address, feeMock } = data;

    // Get and validate hold
    const hold = await prisma.slotHold.findUnique({
      where: { id: holdId }
    });

    if (!hold) {
      throw new Error('Slot hold not found');
    }

    if (hold.status !== 'active' || hold.ttlExpiresAt < new Date()) {
      throw new Error('Slot hold has expired');
    }

    if (hold.patient_id && hold.patient_id !== patientId) {
      throw new Error('Slot hold belongs to another user');
    }

    // Create appointment in transaction
    const appointment = await prisma.$transaction(async (tx) => {
      // Double-check no concurrent booking
      const conflict = await tx.appointment.findFirst({
        where: {
          doctor_id: hold.doctor_id,
          startTs: hold.startTs,
          status: { in: ['CONFIRMED', 'STARTED'] }
        }
      });

      if (conflict) {
        throw new Error('Slot was booked by another user');
      }

      // Create appointment
      const apt = await tx.appointment.create({
        data: {
          doctor_id: hold.doctor_id,
          clinic_id: hold.clinic_id,
          patient_id: patientId,
          startTs: hold.startTs,
          endTs: hold.endTs,
          status: 'CONFIRMED',
          visitType: visitType || 'CLINIC',
          address: visitType === 'HOUSE' ? address : null,
          feeMock: feeMock || 500
        },
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          clinic: true,
          patient: {
            include: {
              user: true
            }
          }
        }
      });

      // Mark hold as consumed
      await tx.slotHold.update({
        where: { id: holdId },
        data: { status: 'consumed' }
      });

      return apt;
    });

    // Clean up Redis
    await redisClient.del(`hold:${holdId}`);

    // Trigger notifications (async)
    this.triggerBookingNotifications(appointment);

    return appointment;
  }

  // Direct booking without hold (for walk-ins, staff)
  async createDirectAppointment(data) {
    const { doctorId, clinicId, patientId, startTs, endTs, visitType, address, feeMock } = data;

    const appointment = await prisma.$transaction(async (tx) => {
      // Check for conflicts
      const conflict = await tx.appointment.findFirst({
        where: {
          doctor_id: doctorId,
          startTs: new Date(startTs),
          status: { in: ['CONFIRMED', 'STARTED'] }
        }
      });

      if (conflict) {
        throw new Error('Time slot is already booked');
      }

      return await tx.appointment.create({
        data: {
          doctor_id: doctorId,
          clinic_id: clinicId,
          patient_id: patientId,
          startTs: new Date(startTs),
          endTs: new Date(endTs),
          status: 'CONFIRMED',
          visitType: visitType || 'CLINIC',
          address,
          feeMock: feeMock || 500
        },
        include: {
          doctor: { include: { user: true } },
          clinic: true,
          patient: { include: { user: true } }
        }
      });
    });

    this.triggerBookingNotifications(appointment);
    return appointment;
  }

  // Check-in for appointment
  async checkIn(appointmentId, patientId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.patient_id !== patientId) {
      throw new Error('Unauthorized');
    }

    return await prisma.appointment.update({
      where: { id: appointmentId },
      data: { checkedInAt: new Date() }
    });
  }

  // Start consultation (doctor)
  async startConsultation(appointmentId, doctorId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.doctor_id !== doctorId) {
      throw new Error('Unauthorized');
    }

    return await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'STARTED',
        consultStartedAt: new Date()
      }
    });
  }

  // End consultation
  async endConsultation(appointmentId, doctorId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment || appointment.doctor_id !== doctorId) {
      throw new Error('Appointment not found or unauthorized');
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'COMPLETED',
        consultEndedAt: new Date()
      }
    });

    // Update doctor's average consult time
    this.updateDoctorAvgConsultTime(doctorId);

    return updated;
  }

  // Reschedule appointment
  async rescheduleAppointment(appointmentId, newStartTs, newEndTs) {
    return await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check new slot availability
      const conflict = await tx.appointment.findFirst({
        where: {
          doctor_id: appointment.doctor_id,
          clinic_id: appointment.clinic_id,
          startTs: new Date(newStartTs),
          status: { in: ['CONFIRMED', 'STARTED'] },
          id: { not: appointmentId }
        }
      });

      if (conflict) {
        throw new Error('New time slot is not available');
      }

      return await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          startTs: new Date(newStartTs),
          endTs: new Date(newEndTs),
          status: 'RESCHEDULED'
        }
      });
    });
  }

  // Cancel appointment
  async cancelAppointment(appointmentId, userId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } }
      }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Check authorization
    if (appointment.patient.user_id !== userId && appointment.doctor.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    return await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' }
    });
  }

  // Get user appointments
  async getPatientAppointments(patientId, status = null) {
    const where = { patient_id: patientId };
    if (status) where.status = status;

    return await prisma.appointment.findMany({
      where,
      include: {
        doctor: { include: { user: true } },
        clinic: true,
        prescription: true
      },
      orderBy: { startTs: 'desc' }
    });
  }

  // Get doctor appointments
  async getDoctorAppointments(doctorId, date = null) {
    const where = { doctor_id: doctorId };
    
    if (date) {
      // Date comes as "2024-01-15" (YYYY-MM-DD format)
      // Parse as UTC to avoid timezone issues - this ensures consistent date matching
      // When querying for "2024-01-15", we want all appointments on that calendar day in UTC
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      
      where.startTs = { 
        gte: startOfDay, 
        lte: endOfDay 
      };
    }

    return await prisma.appointment.findMany({
      where,
      include: {
        patient: { include: { user: true } },
        clinic: true,
        prescription: true
      },
      orderBy: { startTs: 'asc' }
    });
  }

  // Trigger booking notifications (async)
  async triggerBookingNotifications(appointment) {
    try {
      // 1. Send instant booking confirmation (EMAIL, SMS, PUSH)
      await notificationService.queueNotification('booking_instant', { appointment });
      console.log(`✅ Queued instant booking notification for appointment ${appointment.id}`);

      // 2. Schedule 24-hour reminder
      const appointmentTime = new Date(appointment.startTs);
      const now = new Date();
      const timeTo24HoursBefore = appointmentTime.getTime() - now.getTime() - (24 * 60 * 60 * 1000);

      if (timeTo24HoursBefore > 0) {
        await notificationService.queueNotification(
          'reminder_24h',
          { appointmentId: appointment.id },
          timeTo24HoursBefore
        );
        console.log(`✅ Scheduled 24-hour reminder for appointment ${appointment.id}`);
      }

      // 3. Schedule 1-hour reminder
      const timeTo1HourBefore = appointmentTime.getTime() - now.getTime() - (60 * 60 * 1000);

      if (timeTo1HourBefore > 0) {
        await notificationService.queueNotification(
          'reminder_1h',
          { appointmentId: appointment.id },
          timeTo1HourBefore
        );
        console.log(`✅ Scheduled 1-hour reminder for appointment ${appointment.id}`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to queue booking notifications:', error);
      // Don't throw - booking is already confirmed, notifications are secondary
      return { success: false, error: error.message };
    }
  }

  // Update doctor average consult time
  async updateDoctorAvgConsultTime(doctorId) {
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctorId,
        status: 'COMPLETED',
        consultStartedAt: { not: null },
        consultEndedAt: { not: null }
      },
      select: {
        consultStartedAt: true,
        consultEndedAt: true
      },
      take: 50 // Last 50 appointments
    });

    if (completedAppointments.length > 0) {
      const totalMinutes = completedAppointments.reduce((sum, apt) => {
        const duration = (apt.consultEndedAt - apt.consultStartedAt) / (1000 * 60);
        return sum + duration;
      }, 0);

      const avgMinutes = Math.round(totalMinutes / completedAppointments.length);

      await prisma.doctor.update({
        where: { id: doctorId },
        data: { avgConsultMin: avgMinutes }
      });
    }
  }
}

export default new BookingService();

