import prisma from '../config/prisma.js';

class WaitTimeService {
  constructor() {
    this.DEFAULT_OVERRUN_FACTOR = 1.1;
    this.DEFAULT_AVG_WAIT = 10; // minutes
  }

  // Get real-time wait estimate for a specific appointment
  async getWaitEstimate(appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: true,
        clinic: true
      }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const now = new Date();
    const scheduledStart = new Date(appointment.startTs);

    // If appointment time hasn't arrived yet
    if (scheduledStart > now) {
      const minutesUntil = Math.ceil((scheduledStart - now) / (1000 * 60));
      return {
        estimatedWaitMinutes: minutesUntil,
        status: 'scheduled',
        message: `Your appointment is scheduled in ${minutesUntil} minutes`,
        canCheckIn: minutesUntil <= 15
      };
    }

    // Get current queue position
    const queuePosition = await this.getQueuePosition(appointment);

    // Get historical overrun data
    const overrunFactor = await this.getOverrunFactor(
      appointment.doctor_id,
      scheduledStart.getDay(),
      scheduledStart.getHours()
    );

    // Calculate estimate
    const baseWaitTime = queuePosition.position * appointment.doctor.avgConsultMin;
    const adjustedWaitTime = Math.ceil(baseWaitTime * overrunFactor);

    return {
      estimatedWaitMinutes: adjustedWaitTime,
      queuePosition: queuePosition.position,
      totalInQueue: queuePosition.total,
      status: queuePosition.status,
      message: this.getWaitMessage(queuePosition.position, adjustedWaitTime),
      lastUpdated: new Date()
    };
  }

  // Get queue position for appointment
  async getQueuePosition(appointment) {
    const now = new Date();

    // Get all appointments for the doctor on this day
    const startOfDay = new Date(appointment.startTs);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointment.startTs);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctor_id: appointment.doctor_id,
        startTs: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { in: ['CONFIRMED', 'STARTED'] }
      },
      orderBy: { startTs: 'asc' }
    });

    // Find appointments ahead in queue
    let position = 0;
    let status = 'waiting';

    for (const apt of appointments) {
      if (apt.id === appointment.id) {
        break;
      }
      
      // Only count if not completed and started time is before current appointment
      if (apt.status !== 'COMPLETED' && apt.startTs <= appointment.startTs) {
        position++;
      }
    }

    // Check if doctor is currently with a patient
    const currentlyServing = appointments.find(
      apt => apt.status === 'STARTED' && !apt.consultEndedAt
    );

    if (currentlyServing && currentlyServing.id === appointment.id) {
      status = 'in_consultation';
      position = 0;
    } else if (position === 0 && !currentlyServing) {
      status = 'next';
    }

    return {
      position: Math.max(0, position),
      total: appointments.length,
      status
    };
  }

  // Get overrun factor for doctor at specific time
  async getOverrunFactor(doctorId, weekday, hour) {
    const estimate = await prisma.waitTimeEstimate.findUnique({
      where: {
        doctor_id_weekday_hour: {
          doctor_id: doctorId,
          weekday,
          hour
        }
      }
    });

    return estimate?.overrunFactor || this.DEFAULT_OVERRUN_FACTOR;
  }

  // Update overrun factor based on actual data
  async updateOverrunFactors(doctorId) {
    // Get completed appointments from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctorId,
        status: 'COMPLETED',
        consultStartedAt: { not: null },
        consultEndedAt: { not: null },
        startTs: { gte: thirtyDaysAgo }
      }
    });

    // Group by weekday and hour
    const timeSlots = {};

    for (const apt of appointments) {
      const startTs = new Date(apt.startTs);
      const weekday = startTs.getDay();
      const hour = startTs.getHours();
      const key = `${weekday}-${hour}`;

      if (!timeSlots[key]) {
        timeSlots[key] = {
          weekday,
          hour,
          delays: [],
          actualDurations: []
        };
      }

      // Calculate delay (difference between scheduled start and actual start)
      const delay = (apt.consultStartedAt - apt.startTs) / (1000 * 60);
      timeSlots[key].delays.push(delay);

      // Calculate actual duration
      const duration = (apt.consultEndedAt - apt.consultStartedAt) / (1000 * 60);
      timeSlots[key].actualDurations.push(duration);
    }

    // Update estimates in database
    for (const [key, data] of Object.entries(timeSlots)) {
      const avgDelay = data.delays.reduce((a, b) => a + b, 0) / data.delays.length;
      const avgDuration = data.actualDurations.reduce((a, b) => a + b, 0) / data.actualDurations.length;
      
      // Calculate overrun factor
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId }
      });
      
      const expectedDuration = doctor?.avgConsultMin || 15;
      const overrunFactor = avgDuration / expectedDuration;

      await prisma.waitTimeEstimate.upsert({
        where: {
          doctor_id_weekday_hour: {
            doctor_id: doctorId,
            weekday: data.weekday,
            hour: data.hour
          }
        },
        create: {
          doctor_id: doctorId,
          weekday: data.weekday,
          hour: data.hour,
          overrunFactor: Math.max(1.0, overrunFactor),
          avgWaitMinutes: Math.ceil(avgDelay)
        },
        update: {
          overrunFactor: Math.max(1.0, overrunFactor),
          avgWaitMinutes: Math.ceil(avgDelay)
        }
      });
    }

    return { updated: Object.keys(timeSlots).length };
  }

  // Get wait message
  getWaitMessage(position, waitMinutes) {
    if (position === 0) {
      return 'You\'re next! Please be ready.';
    } else if (position === 1) {
      return `There is 1 patient ahead of you. Estimated wait: ${waitMinutes} minutes.`;
    } else if (waitMinutes < 5) {
      return 'The doctor will see you very soon!';
    } else {
      return `There are ${position} patients ahead of you. Estimated wait: ${waitMinutes} minutes.`;
    }
  }

  // Get doctor current status
  async getDoctorStatus(doctorId) {
    const now = new Date();
    
    // Get today's appointments
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctorId,
        startTs: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { startTs: 'asc' }
    });

    const currentAppointment = appointments.find(
      apt => apt.status === 'STARTED' && !apt.consultEndedAt
    );

    const checkedIn = appointments.filter(apt => apt.checkedInAt && apt.status === 'CONFIRMED');
    const completed = appointments.filter(apt => apt.status === 'COMPLETED');

    let status = 'available';
    let message = 'Doctor is available';

    if (currentAppointment) {
      status = 'busy';
      const consultDuration = Math.ceil((now - currentAppointment.consultStartedAt) / (1000 * 60));
      message = `In consultation for ${consultDuration} minutes`;
    } else if (checkedIn.length > 0) {
      status = 'available';
      message = `Ready for next patient (${checkedIn.length} waiting)`;
    } else {
      message = `${completed.length} consultations completed today`;
    }

    return {
      status,
      message,
      currentPatient: currentAppointment ? currentAppointment.patient_id : null,
      waitingCount: checkedIn.length,
      completedToday: completed.length,
      totalToday: appointments.length
    };
  }

  // Batch update wait times for all active appointments
  async updateAllWaitTimes() {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Get all upcoming appointments in the next hour
    const appointments = await prisma.appointment.findMany({
      where: {
        startTs: {
          gte: now,
          lte: oneHourLater
        },
        status: { in: ['CONFIRMED', 'STARTED'] }
      },
      include: {
        doctor: true
      }
    });

    const updates = [];

    for (const appointment of appointments) {
      try {
        const estimate = await this.getWaitEstimate(appointment.id);
        updates.push({
          appointmentId: appointment.id,
          estimate
        });
      } catch (error) {
        console.error(`Failed to update wait time for ${appointment.id}:`, error);
      }
    }

    return updates;
  }
}

export default new WaitTimeService();

