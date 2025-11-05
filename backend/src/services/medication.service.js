import prisma from '../config/prisma.js';
import notificationService from './notification.service.js';
import cron from 'node-cron';

class MedicationService {
  constructor() {
    // Start cron job for medication reminders
    this.startReminderScheduler();
  }

  // Start cron job that runs every hour
  startReminderScheduler() {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
      console.log('Running medication reminder job...');
      await this.processHourlyReminders();
    });

    // Also run every 15 minutes for more frequent medications
    cron.schedule('*/15 * * * *', async () => {
      console.log('Running 15-minute medication check...');
      await this.processFrequentReminders();
    });
  }

  // Process hourly reminders
  async processHourlyReminders() {
    const now = new Date();
    const currentHour = now.getHours();

    // Get all active medications that need reminders
    const medications = await prisma.medication.findMany({
      where: {
        remindersEnabled: true,
        startDate: { lte: now }
      },
      include: {
        patient: {
          include: { user: true }
        }
      }
    });

    for (const medication of medications) {
      // Check if medication is still active
      if (medication.durationDays) {
        const endDate = new Date(medication.startDate);
        endDate.setDate(endDate.getDate() + medication.durationDays);
        
        if (endDate < now) {
          // Medication period ended, disable reminders
          await prisma.medication.update({
            where: { id: medication.id },
            data: { remindersEnabled: false }
          });
          continue;
        }
      }

      // Check if reminder should be sent at this hour
      const reminderTimes = this.getReminderTimes(medication.freq);
      
      if (reminderTimes.includes(currentHour)) {
        await notificationService.queueNotification('med_reminder', {
          medicationId: medication.id,
          patientId: medication.patient_id
        });
      }
    }
  }

  // Process frequent reminders (every 4-6 hours medications)
  async processFrequentReminders() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Handle medications that need to be taken every 4, 6, or 8 hours
    const medications = await prisma.medication.findMany({
      where: {
        remindersEnabled: true,
        freq: {
          in: ['every 4 hours', 'every 6 hours', 'every 8 hours', 'q4h', 'q6h', 'q8h']
        }
      },
      include: {
        patient: { include: { user: true } }
      }
    });

    for (const medication of medications) {
      const interval = this.parseInterval(medication.freq);
      const hoursSinceStart = Math.floor((now - medication.startDate) / (1000 * 60 * 60));
      
      // Check if it's time for a dose
      if (hoursSinceStart % interval === 0 && currentMinute < 15) {
        await notificationService.queueNotification('med_reminder', {
          medicationId: medication.id,
          patientId: medication.patient_id
        });
      }
    }
  }

  // Get reminder times based on frequency
  getReminderTimes(frequency) {
    const freqLower = frequency.toLowerCase();
    
    const schedules = {
      // Once daily
      '1x daily': [9], // 9 AM
      'once daily': [9],
      'od': [9],
      
      // Twice daily
      '2x daily': [9, 21], // 9 AM, 9 PM
      'twice daily': [9, 21],
      'bd': [9, 21],
      'bid': [9, 21],
      
      // Three times daily
      '3x daily': [8, 14, 20], // 8 AM, 2 PM, 8 PM
      'thrice daily': [8, 14, 20],
      'tds': [8, 14, 20],
      'tid': [8, 14, 20],
      
      // Four times daily
      '4x daily': [8, 12, 16, 20], // 8 AM, 12 PM, 4 PM, 8 PM
      'qds': [8, 12, 16, 20],
      'qid': [8, 12, 16, 20],
      
      // Before meals
      'before meals': [7, 12, 18],
      'ac': [7, 12, 18],
      
      // After meals
      'after meals': [9, 14, 21],
      'pc': [9, 14, 21],
      
      // At bedtime
      'at bedtime': [22],
      'hs': [22],
      'bedtime': [22]
    };

    return schedules[freqLower] || [9, 21]; // Default to twice daily
  }

  // Parse interval from frequency string
  parseInterval(frequency) {
    const match = frequency.match(/(\d+)\s*(?:hour|hr|h)/i);
    if (match) {
      return parseInt(match[1]);
    }
    
    // Map common abbreviations
    const intervals = {
      'q4h': 4,
      'q6h': 6,
      'q8h': 8,
      'q12h': 12
    };
    
    return intervals[frequency.toLowerCase()] || 24;
  }

  // Create medication schedule for patient
  async createMedicationSchedule(medicationId, customSchedule = null) {
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId }
    });

    if (!medication) {
      throw new Error('Medication not found');
    }

    let schedule;
    
    if (customSchedule) {
      // Use custom times provided by user/doctor
      schedule = customSchedule;
    } else {
      // Generate schedule from frequency
      schedule = this.getReminderTimes(medication.freq);
    }

    // Enable reminders
    await prisma.medication.update({
      where: { id: medicationId },
      data: { remindersEnabled: true }
    });

    return {
      medicationId,
      schedule,
      message: 'Reminders enabled successfully'
    };
  }

  // Get patient's medication reminders for today
  async getTodayReminders(patientId) {
    const medications = await prisma.medication.findMany({
      where: {
        patient_id: patientId,
        remindersEnabled: true
      }
    });

    const now = new Date();
    const reminders = [];

    for (const medication of medications) {
      // Check if still active
      if (medication.durationDays) {
        const endDate = new Date(medication.startDate);
        endDate.setDate(endDate.getDate() + medication.durationDays);
        if (endDate < now) continue;
      }

      const times = this.getReminderTimes(medication.freq);
      
      for (const hour of times) {
        const reminderTime = new Date();
        reminderTime.setHours(hour, 0, 0, 0);
        
        reminders.push({
          medicationId: medication.id,
          medicationName: medication.name,
          dosage: `${medication.strength} ${medication.form}`,
          time: reminderTime,
          taken: false, // Would track this in a separate table
          route: medication.route
        });
      }
    }

    // Sort by time
    reminders.sort((a, b) => a.time - b.time);

    return reminders;
  }

  // Mark medication as taken
  async markMedicationTaken(medicationId, takenAt = new Date()) {
    // This would ideally store in a medication_logs table
    // For now, we'll just return success
    
    // TODO: Create medication_logs table and track adherence
    
    return {
      success: true,
      medicationId,
      takenAt,
      message: 'Medication marked as taken'
    };
  }

  // Get medication adherence stats
  async getAdherenceStats(patientId, days = 30) {
    const medications = await prisma.medication.findMany({
      where: {
        patient_id: patientId,
        startDate: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      }
    });

    // TODO: Calculate actual adherence from medication_logs
    // For now, return placeholder data
    
    return {
      totalMedications: medications.length,
      activeMedications: medications.filter(m => m.remindersEnabled).length,
      adherenceRate: 85, // Placeholder
      missedDoses: 5, // Placeholder
      period: `${days} days`
    };
  }

  // Disable reminders for medication
  async disableReminders(medicationId) {
    return await prisma.medication.update({
      where: { id: medicationId },
      data: { remindersEnabled: false }
    });
  }

  // Get refill reminders
  async getRefillReminders(patientId) {
    const medications = await prisma.medication.findMany({
      where: {
        patient_id: patientId,
        remindersEnabled: true,
        durationDays: { not: null }
      }
    });

    const now = new Date();
    const refillReminders = [];

    for (const medication of medications) {
      const endDate = new Date(medication.startDate);
      endDate.setDate(endDate.getDate() + medication.durationDays);
      
      // Remind 3 days before medication runs out
      const reminderDate = new Date(endDate);
      reminderDate.setDate(reminderDate.getDate() - 3);
      
      if (reminderDate <= now && endDate > now) {
        refillReminders.push({
          medicationId: medication.id,
          medicationName: medication.name,
          endsOn: endDate,
          daysRemaining: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
        });
      }
    }

    return refillReminders;
  }
}

export default new MedicationService();

