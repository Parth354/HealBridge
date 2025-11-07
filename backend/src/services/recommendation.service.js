/**
 * Recommendation Engine - Intelligent Healthcare Recommendations
 * 
 * Purpose:
 * - Recommend doctors based on patient symptoms and medical history
 * - Suggest optimal appointment times based on patient and doctor preferences
 * - Recommend follow-up appointments
 * - Provide personalized health tips
 * - Learn from patient feedback and behavior
 */

import prisma from '../config/prisma.js';
import searchService from './search.service.js';
import triageService from './triage.service.js';
import syncService from './sync.service.js';
import redisClient from '../config/redis.js';

class RecommendationService {
  constructor() {
    this.CACHE_TTL = 3600; // 1 hour
    this.CACHE_PREFIX = 'recommend:';
  }

  /**
   * Recommend doctors based on patient symptoms
   * @param {Object} data - Patient symptoms and preferences
   * @returns {Promise<Array>} Recommended doctors with match scores
   */
  async recommendDoctorsForSymptoms(data) {
    const { symptoms, patientLocation, urgency, preferredVisitType } = data;

    try {
      // Analyze symptoms to get recommended specialty
      const triageResult = await triageService.analyzeSymptomsSimple(symptoms);
      const recommendedSpecialty = triageResult.recommendedSpecialty;

      // Search for doctors in that specialty
      const doctors = await searchService.searchDoctors({
        specialty: recommendedSpecialty,
        lat: patientLocation?.lat,
        lon: patientLocation?.lon,
        visitType: preferredVisitType,
        sortBy: 'recommended',
        limit: 10
      });

      // Score and rank doctors based on symptom match
      const rankedDoctors = doctors.results.map(doctor => {
        const score = this.calculateSymptomMatchScore(doctor, {
          specialty: recommendedSpecialty,
          urgency,
          preferredVisitType
        });

        return {
          ...doctor,
          matchScore: score,
          recommendationReason: this.generateRecommendationReason(doctor, recommendedSpecialty, urgency)
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      return {
        recommendedSpecialty,
        urgency: triageResult.urgency,
        doctors: rankedDoctors.slice(0, 5)
      };
    } catch (error) {
      console.error('Error recommending doctors for symptoms:', error);
      throw error;
    }
  }

  /**
   * Calculate match score between doctor and patient needs
   */
  calculateSymptomMatchScore(doctor, criteria) {
    let score = 0;

    // Specialty match (40 points)
    if (doctor.specialties.includes(criteria.specialty)) {
      score += 40;
    }

    // Rating (30 points)
    score += doctor.rating * 6; // Max 30 for 5-star rating

    // Distance (15 points)
    if (doctor.distance !== null) {
      const distanceScore = Math.max(0, 15 * (1 - doctor.distance / 50));
      score += distanceScore;
    }

    // Visit type availability (15 points)
    if (criteria.preferredVisitType && 
        doctor.clinics.some(c => c.visitTypes?.includes(criteria.preferredVisitType))) {
      score += 15;
    }

    return score;
  }

  /**
   * Generate explanation for why doctor is recommended
   */
  generateRecommendationReason(doctor, specialty, urgency) {
    const reasons = [];

    if (doctor.specialties.includes(specialty)) {
      reasons.push(`Specializes in ${specialty}`);
    }

    if (doctor.rating >= 4.5) {
      reasons.push('Highly rated');
    }

    if (doctor.distance && doctor.distance < 5) {
      reasons.push('Nearby location');
    }

    if (urgency === 'high' && doctor.availableToday) {
      reasons.push('Available today');
    }

    return reasons.join(' • ');
  }

  /**
   * Suggest optimal appointment time based on patient and doctor availability
   * @param {Object} data - Doctor ID, patient ID, preferred dates
   * @returns {Promise<Array>} Suggested time slots with scores
   */
  async suggestAppointmentTimes(data) {
    const { doctorId, patientId, preferredDates, visitType } = data;

    try {
      // Get patient's past appointment patterns
      const patientHistory = await this.getPatientAppointmentPatterns(patientId);

      // Get doctor's availability
      const availability = [];

      for (const date of preferredDates) {
        const dayOfWeek = new Date(date).getDay();

        // Get doctor's schedule for this day
        const schedules = await prisma.schedule.findMany({
          where: {
            doctor_id: doctorId,
            dayOfWeek,
            isActive: true
          }
        });

        // Get existing appointments
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const appointments = await prisma.appointment.findMany({
          where: {
            doctor_id: doctorId,
            startTs: {
              gte: startOfDay,
              lte: endOfDay
            },
            status: { in: ['CONFIRMED', 'HOLD'] }
          }
        });

        // Generate available slots
        for (const schedule of schedules) {
          const slots = this.generateTimeSlots(
            date,
            schedule.startTime,
            schedule.endTime,
            15 // 15-minute slots
          );

          // Filter out booked slots
          const availableSlots = slots.filter(slot => {
            return !appointments.some(apt => {
              const aptTime = new Date(apt.startTs).getTime();
              return aptTime === slot.getTime();
            });
          });

          availability.push(...availableSlots);
        }
      }

      // Score each slot based on patient preferences
      const scoredSlots = availability.map(slot => {
        const score = this.scoreTimeSlot(slot, patientHistory);
        return {
          time: slot,
          score,
          reason: this.getTimeSlotReason(slot, patientHistory)
        };
      }).sort((a, b) => b.score - a.score);

      return scoredSlots.slice(0, 10);
    } catch (error) {
      console.error('Error suggesting appointment times:', error);
      throw error;
    }
  }

  /**
   * Get patient's appointment patterns
   */
  async getPatientAppointmentPatterns(patientId) {
    const appointments = await prisma.appointment.findMany({
      where: {
        patient_id: patientId,
        status: 'COMPLETED'
      },
      select: {
        startTs: true
      },
      orderBy: {
        startTs: 'desc'
      },
      take: 20
    });

    // Analyze patterns
    const hourCounts = {};
    const dayOfWeekCounts = {};

    appointments.forEach(apt => {
      const date = new Date(apt.startTs);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
    });

    // Find preferred time
    const preferredHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 10; // Default 10 AM

    const preferredDay = Object.entries(dayOfWeekCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 1; // Default Monday

    return {
      preferredHour: parseInt(preferredHour),
      preferredDay: parseInt(preferredDay),
      appointmentCount: appointments.length
    };
  }

  /**
   * Generate time slots for a day
   */
  generateTimeSlots(date, startTime, endTime, intervalMinutes) {
    const slots = [];
    const day = new Date(date);
    
    // Convert time strings to Date objects
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const current = new Date(day);
    current.setHours(startHour, startMin, 0, 0);

    const end = new Date(day);
    end.setHours(endHour, endMin, 0, 0);

    while (current < end) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + intervalMinutes);
    }

    return slots;
  }

  /**
   * Score time slot based on patient preferences
   */
  scoreTimeSlot(slot, patientHistory) {
    let score = 50; // Base score

    const hour = slot.getHours();
    const dayOfWeek = slot.getDay();

    // Prefer patient's usual time (+20 points)
    if (patientHistory.preferredHour) {
      const hourDiff = Math.abs(hour - patientHistory.preferredHour);
      score += Math.max(0, 20 - (hourDiff * 2));
    }

    // Prefer patient's usual day (+15 points)
    if (dayOfWeek === patientHistory.preferredDay) {
      score += 15;
    }

    // Prefer business hours 9 AM - 5 PM (+10 points)
    if (hour >= 9 && hour <= 17) {
      score += 10;
    }

    // Prefer early slots for urgent care (+5 points for earlier in day)
    score += (18 - hour) * 0.5;

    return score;
  }

  /**
   * Get reason for time slot recommendation
   */
  getTimeSlotReason(slot, patientHistory) {
    const hour = slot.getHours();
    const dayOfWeek = slot.getDay();
    const reasons = [];

    if (Math.abs(hour - patientHistory.preferredHour) <= 1) {
      reasons.push('Your usual time');
    }

    if (dayOfWeek === patientHistory.preferredDay) {
      reasons.push('Your preferred day');
    }

    if (hour >= 9 && hour <= 12) {
      reasons.push('Morning slot');
    } else if (hour >= 14 && hour <= 17) {
      reasons.push('Afternoon slot');
    }

    return reasons.join(' • ') || 'Available slot';
  }

  /**
   * Recommend follow-up appointments
   * @param {string} appointmentId - Completed appointment ID
   * @returns {Promise<Object>} Follow-up recommendation
   */
  async recommendFollowUp(appointmentId) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          doctor: true,
          patient: true,
          prescription: {
            include: { medications: true }
          }
        }
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Determine if follow-up is needed
      const needsFollowUp = this.determineFollowUpNeed(appointment);

      if (!needsFollowUp.needed) {
        return { needed: false };
      }

      // Calculate recommended follow-up date
      const recommendedDate = this.calculateFollowUpDate(appointment, needsFollowUp.reason);

      return {
        needed: true,
        reason: needsFollowUp.reason,
        recommendedDate,
        doctor: {
          id: appointment.doctor.id,
          name: appointment.doctor.user.email, // Replace with actual name
          specialty: appointment.doctor.specialties[0]
        },
        priority: needsFollowUp.priority
      };
    } catch (error) {
      console.error('Error recommending follow-up:', error);
      throw error;
    }
  }

  /**
   * Determine if follow-up is needed
   */
  determineFollowUpNeed(appointment) {
    const reasons = [];
    let priority = 'normal';

    // Check prescription - long-term medications need follow-up
    if (appointment.prescription && appointment.prescription.medications.length > 0) {
      const longestMedication = appointment.prescription.medications
        .reduce((max, med) => med.durationDays > max ? med.durationDays : max, 0);

      if (longestMedication >= 30) {
        reasons.push('Long-term medication monitoring');
        priority = 'high';
      }
    }

    // Check appointment type and specialty
    const specialtiesNeedingFollowUp = ['Cardiology', 'Endocrinology', 'Oncology', 'Psychiatry'];
    if (appointment.doctor.specialties.some(s => specialtiesNeedingFollowUp.includes(s))) {
      reasons.push('Chronic condition management');
      priority = 'high';
    }

    return {
      needed: reasons.length > 0,
      reason: reasons.join(', '),
      priority
    };
  }

  /**
   * Calculate recommended follow-up date
   */
  calculateFollowUpDate(appointment, reason) {
    const appointmentDate = new Date(appointment.startTs);
    let daysUntilFollowUp = 30; // Default 30 days

    // Adjust based on reason
    if (reason.includes('Long-term medication')) {
      daysUntilFollowUp = 30;
    } else if (reason.includes('Chronic condition')) {
      daysUntilFollowUp = 14;
    }

    const followUpDate = new Date(appointmentDate);
    followUpDate.setDate(followUpDate.getDate() + daysUntilFollowUp);

    return followUpDate;
  }

  /**
   * Get personalized health tips for patient
   * @param {string} firebaseUid - Patient's Firebase UID
   * @returns {Promise<Array>} Personalized health tips
   */
  async getPersonalizedHealthTips(firebaseUid) {
    try {
      // Get patient data
      const patientData = await syncService.getCompletePatientData(firebaseUid);

      if (!patientData || !patientData.profile) {
        return this.getGeneralHealthTips();
      }

      const tips = [];

      // Medication reminders
      if (patientData.medications && patientData.medications.length > 0) {
        const activeMeds = patientData.medications.filter(m => {
          const endDate = new Date(m.startDate);
          endDate.setDate(endDate.getDate() + m.durationDays);
          return endDate > new Date();
        });

        if (activeMeds.length > 0) {
          tips.push({
            type: 'medication',
            priority: 'high',
            title: 'Medication Reminder',
            message: `You have ${activeMeds.length} active medication(s). Don't forget to take them as prescribed.`,
            action: 'View Medications'
          });
        }
      }

      // Condition-specific tips
      if (patientData.profile.conditions && patientData.profile.conditions.length > 0) {
        const conditionTips = this.getConditionSpecificTips(patientData.profile.conditions);
        tips.push(...conditionTips);
      }

      // Upcoming appointment reminders
      if (patientData.appointments && patientData.appointments.length > 0) {
        const upcomingApts = patientData.appointments.filter(apt => 
          new Date(apt.startTs) > new Date() && 
          apt.status === 'CONFIRMED'
        );

        if (upcomingApts.length > 0) {
          tips.push({
            type: 'appointment',
            priority: 'high',
            title: 'Upcoming Appointment',
            message: `You have an appointment on ${new Date(upcomingApts[0].startTs).toLocaleDateString()}`,
            action: 'View Details'
          });
        }
      }

      // Add general wellness tips
      tips.push(...this.getGeneralHealthTips().slice(0, 2));

      return tips;
    } catch (error) {
      console.error('Error getting personalized health tips:', error);
      return this.getGeneralHealthTips();
    }
  }

  /**
   * Get condition-specific health tips
   */
  getConditionSpecificTips(conditions) {
    const tips = [];
    const tipMap = {
      'Hypertension': {
        type: 'lifestyle',
        priority: 'medium',
        title: 'Blood Pressure Management',
        message: 'Monitor your blood pressure regularly and reduce sodium intake',
        action: 'Learn More'
      },
      'Diabetes': {
        type: 'lifestyle',
        priority: 'high',
        title: 'Blood Sugar Control',
        message: 'Check your blood glucose levels and maintain a balanced diet',
        action: 'Diet Tips'
      },
      'Asthma': {
        type: 'lifestyle',
        priority: 'medium',
        title: 'Asthma Management',
        message: 'Keep your inhaler handy and avoid triggers',
        action: 'View Guide'
      }
    };

    conditions.forEach(condition => {
      if (tipMap[condition]) {
        tips.push(tipMap[condition]);
      }
    });

    return tips;
  }

  /**
   * Get general health tips
   */
  getGeneralHealthTips() {
    return [
      {
        type: 'wellness',
        priority: 'low',
        title: 'Stay Hydrated',
        message: 'Drink at least 8 glasses of water daily',
        action: null
      },
      {
        type: 'wellness',
        priority: 'low',
        title: 'Regular Exercise',
        message: 'Aim for 30 minutes of physical activity daily',
        action: null
      },
      {
        type: 'wellness',
        priority: 'low',
        title: 'Quality Sleep',
        message: 'Get 7-8 hours of sleep each night',
        action: null
      },
      {
        type: 'wellness',
        priority: 'low',
        title: 'Balanced Diet',
        message: 'Include fruits, vegetables, and whole grains in your meals',
        action: null
      }
    ];
  }

  /**
   * Get doctor recommendations based on patient history
   */
  async getPersonalizedDoctorRecommendations(firebaseUid, options = {}) {
    try {
      const { limit = 5, lat, lon } = options;

      // Get patient's past appointments to find preferred specialties
      const patientData = await syncService.getCompletePatientData(firebaseUid);

      if (!patientData || !patientData.appointments) {
        return [];
      }

      // Find most visited specialties
      const specialtyCount = {};
      patientData.appointments.forEach(apt => {
        if (apt.doctor && apt.doctor.specialties) {
          apt.doctor.specialties.forEach(specialty => {
            specialtyCount[specialty] = (specialtyCount[specialty] || 0) + 1;
          });
        }
      });

      const topSpecialty = Object.entries(specialtyCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      if (!topSpecialty) {
        return [];
      }

      // Get highly-rated doctors in that specialty
      const doctors = await searchService.searchDoctors({
        specialty: topSpecialty,
        minRating: 4.0,
        lat,
        lon,
        sortBy: 'rating',
        limit
      });

      return doctors.results.map(doctor => ({
        ...doctor,
        recommendationReason: `Based on your visits to ${topSpecialty} specialists`
      }));
    } catch (error) {
      console.error('Error getting personalized doctor recommendations:', error);
      return [];
    }
  }
}

export default new RecommendationService();

