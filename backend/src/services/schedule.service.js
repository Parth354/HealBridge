import prisma from '../config/prisma.js';

class ScheduleService {
  // Create schedule blocks for a doctor
  async createScheduleBlock(data) {
    const {
      doctorId,
      clinicId,
      startTs,
      endTs,
      slotMinutes = 15,
      bufferMinutes = 0,
      type = 'work'
    } = data;

    // Validate times
    const start = new Date(startTs);
    const end = new Date(endTs);

    if (start >= end) {
      throw new Error('Start time must be before end time');
    }

    // Check for exact duplicate first
    const exactDuplicate = await prisma.scheduleBlock.findFirst({
      where: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        startTs: start,
        endTs: end
      }
    });

    if (exactDuplicate) {
      throw new Error('Schedule already exists for this exact time slot');
    }

    // Check for conflicts
    const conflicts = await prisma.scheduleBlock.findMany({
      where: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        OR: [
          {
            AND: [
              { startTs: { lte: start } },
              { endTs: { gt: start } }
            ]
          },
          {
            AND: [
              { startTs: { lt: end } },
              { endTs: { gte: end } }
            ]
          },
          {
            AND: [
              { startTs: { gte: start } },
              { endTs: { lte: end } }
            ]
          }
        ]
      }
    });

    if (conflicts.length > 0) {
      throw new Error('Schedule block conflicts with existing schedule');
    }

    return await prisma.scheduleBlock.create({
      data: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        startTs: start,
        endTs: end,
        slotMinutes,
        bufferMinutes,
        type
      }
    });
  }

  // Create recurring schedule (weekly pattern)
  async createRecurringSchedule(data) {
    const {
      doctorId,
      clinicId,
      weekPattern, // Array of { day: 0-6, startTime: 'HH:MM', endTime: 'HH:MM' }
      startDate,
      endDate,
      slotMinutes = 15,
      bufferMinutes = 0
    } = data;

    const scheduleBlocks = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Iterate through each day in the range
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      
      // Check if this day has a schedule pattern
      const pattern = weekPattern.find(p => p.day === dayOfWeek);
      
      if (pattern) {
        // Parse times
        const [startHour, startMin] = pattern.startTime.split(':');
        const [endHour, endMin] = pattern.endTime.split(':');
        
        const blockStart = new Date(currentDate);
        blockStart.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
        
        const blockEnd = new Date(currentDate);
        blockEnd.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

        try {
          const block = await this.createScheduleBlock({
            doctorId,
            clinicId,
            startTs: blockStart,
            endTs: blockEnd,
            slotMinutes,
            bufferMinutes,
            type: 'work'
          });
          scheduleBlocks.push(block);
        } catch (error) {
          // Skip if already exists, log other errors
          if (!error.message.includes('already exists')) {
            console.error(`Failed to create block for ${currentDate}:`, error.message);
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      created: scheduleBlocks.length,
      scheduleBlocks
    };
  }

  // Mark doctor as unavailable (break/holiday)
  async markUnavailable(doctorId, startTs, endTs, type = 'break') {
    const start = new Date(startTs);
    const end = new Date(endTs);
    const clinic = await this.getDoctorDefaultClinic(doctorId);

    // Check if exact same schedule block already exists
    const existing = await prisma.scheduleBlock.findFirst({
      where: {
        doctor_id: doctorId,
        clinic_id: clinic.id,
        startTs: start,
        endTs: end,
        type
      }
    });

    if (existing) {
      throw new Error('Schedule block already exists for this time period');
    }

    return await prisma.scheduleBlock.create({
      data: {
        doctor_id: doctorId,
        clinic_id: clinic.id,
        startTs: start,
        endTs: end,
        slotMinutes: 0,
        bufferMinutes: 0,
        type // 'break' or 'holiday'
      }
    });
  }

  // Get doctor's schedule for a date range
  async getDoctorSchedule(doctorId, startDate, endDate) {
    // Parse date strings (YYYY-MM-DD) and set to UTC to avoid timezone issues
    // When date is "2024-01-15", we want to query from 2024-01-15 00:00:00 UTC to 2024-01-15 23:59:59 UTC
    // But we need to be careful - if date comes as "2024-01-15", create as UTC date
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    const scheduleBlocks = await prisma.scheduleBlock.findMany({
      where: {
        doctor_id: doctorId,
        startTs: { 
          gte: start,
          lte: end
        }
      },
      include: {
        clinic: true
      },
      orderBy: { startTs: 'asc' }
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctorId,
        startTs: { 
          gte: start, 
          lte: end 
        }
      },
      include: {
        patient: { include: { user: true } },
        clinic: true
      },
      orderBy: { startTs: 'asc' }
    });

    return {
      scheduleBlocks,
      appointments,
      summary: {
        workingBlocks: scheduleBlocks.filter(b => b.type === 'work').length,
        breaks: scheduleBlocks.filter(b => b.type === 'break').length,
        holidays: scheduleBlocks.filter(b => b.type === 'holiday').length,
        totalAppointments: appointments.length,
        confirmedAppointments: appointments.filter(a => a.status === 'CONFIRMED').length
      }
    };
  }

  // Delete schedule block
  async deleteScheduleBlock(blockId, doctorId) {
    const block = await prisma.scheduleBlock.findUnique({
      where: { id: blockId }
    });

    if (!block || block.doctor_id !== doctorId) {
      throw new Error('Schedule block not found or unauthorized');
    }

    // Check if there are appointments in this block
    const appointments = await prisma.appointment.count({
      where: {
        doctor_id: doctorId,
        startTs: { gte: block.startTs, lt: block.endTs },
        status: { in: ['CONFIRMED', 'STARTED'] }
      }
    });

    if (appointments > 0) {
      throw new Error('Cannot delete schedule block with existing appointments');
    }

    return await prisma.scheduleBlock.delete({
      where: { id: blockId }
    });
  }

  // Update schedule block
  async updateScheduleBlock(blockId, doctorId, updates) {
    const block = await prisma.scheduleBlock.findUnique({
      where: { id: blockId }
    });

    if (!block || block.doctor_id !== doctorId) {
      throw new Error('Schedule block not found or unauthorized');
    }

    return await prisma.scheduleBlock.update({
      where: { id: blockId },
      data: updates
    });
  }

  // Get doctor's default clinic
  async getDoctorDefaultClinic(doctorId) {
    const clinic = await prisma.clinic.findFirst({
      where: { doctor_id: doctorId },
      orderBy: { createdAt: 'asc' }
    });

    if (!clinic) {
      throw new Error('Doctor has no clinics configured');
    }

    return clinic;
  }

  // Get available time slots for a specific date
  async getAvailableSlots(doctorId, clinicId, date) {
    // Parse date as UTC to avoid timezone issues
    // Date comes as "2024-01-15" (YYYY-MM-DD format)
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    // Get work schedule blocks
    const workBlocks = await prisma.scheduleBlock.findMany({
      where: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        type: 'work',
        startTs: { gte: startOfDay },
        endTs: { lte: endOfDay }
      }
    });

    // Get breaks and holidays
    const unavailableBlocks = await prisma.scheduleBlock.findMany({
      where: {
        doctor_id: doctorId,
        type: { in: ['break', 'holiday'] },
        startTs: { lte: endOfDay },
        endTs: { gte: startOfDay }
      }
    });

    // Get booked appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        startTs: { gte: startOfDay, lte: endOfDay },
        status: { in: ['CONFIRMED', 'STARTED'] }
      }
    });

    // Generate available slots
    const availableSlots = [];

    for (const block of workBlocks) {
      let currentTime = new Date(block.startTs);
      const blockEnd = new Date(block.endTs);
      const slotDuration = block.slotMinutes * 60 * 1000;

      while (currentTime < blockEnd) {
        const slotEnd = new Date(currentTime.getTime() + slotDuration);
        
        if (slotEnd > blockEnd) break;

        // Check if slot is available
        const isBooked = appointments.some(apt => 
          new Date(apt.startTs).getTime() === currentTime.getTime()
        );

        const isDuringBreak = unavailableBlocks.some(ub =>
          currentTime >= new Date(ub.startTs) && currentTime < new Date(ub.endTs)
        );

        const isPast = currentTime < new Date();

        if (!isBooked && !isDuringBreak && !isPast) {
          availableSlots.push({
            startTs: new Date(currentTime),
            endTs: slotEnd,
            available: true
          });
        }

        currentTime = new Date(currentTime.getTime() + slotDuration + (block.bufferMinutes * 60 * 1000));
      }
    }

    return availableSlots;
  }
}

export default new ScheduleService();

