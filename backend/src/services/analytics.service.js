/**
 * Analytics Service - System Analytics and Business Intelligence
 * 
 * Purpose:
 * - Track patient journey and user behavior
 * - Monitor doctor performance metrics
 * - Generate system usage analytics
 * - Calculate revenue and business metrics
 * - Provide real-time dashboard data
 * - Support data-driven decision making
 */

import prisma from '../config/prisma.js';
import redisClient from '../config/redis.js';

class AnalyticsService {
  constructor() {
    this.CACHE_TTL = 300; // 5 minutes
    this.CACHE_PREFIX = 'analytics:';
  }

  /**
   * Get system overview analytics
   * @returns {Promise<Object>} System-wide metrics
   */
  async getSystemOverview() {
    try {
      const cacheKey = `${this.CACHE_PREFIX}system_overview`;
      const cached = await this.getCached(cacheKey);
      if (cached) return cached;

      const [
        totalUsers,
        totalPatients,
        totalDoctors,
        totalAppointments,
        completedAppointments,
        activeAppointments,
        totalPrescriptions,
        totalRevenue
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'PATIENT' } }),
        prisma.user.count({ where: { role: 'DOCTOR' } }),
        prisma.appointment.count(),
        prisma.appointment.count({ where: { status: 'COMPLETED' } }),
        prisma.appointment.count({ 
          where: { 
            status: { in: ['CONFIRMED', 'STARTED'] },
            startTs: { gte: new Date() }
          } 
        }),
        prisma.prescription.count(),
        this.calculateTotalRevenue()
      ]);

      const overview = {
        users: {
          total: totalUsers,
          patients: totalPatients,
          doctors: totalDoctors,
          growthRate: await this.calculateUserGrowthRate()
        },
        appointments: {
          total: totalAppointments,
          completed: completedAppointments,
          active: activeAppointments,
          completionRate: totalAppointments > 0 
            ? ((completedAppointments / totalAppointments) * 100).toFixed(2) 
            : 0
        },
        prescriptions: {
          total: totalPrescriptions,
          averagePerAppointment: totalAppointments > 0 
            ? (totalPrescriptions / totalAppointments).toFixed(2) 
            : 0
        },
        revenue: {
          total: totalRevenue,
          averagePerAppointment: completedAppointments > 0 
            ? (totalRevenue / completedAppointments).toFixed(2) 
            : 0
        },
        timestamp: new Date().toISOString()
      };

      await this.cache(cacheKey, overview, this.CACHE_TTL);
      return overview;
    } catch (error) {
      console.error('Error getting system overview:', error);
      throw error;
    }
  }

  /**
   * Get doctor performance metrics
   * @param {string} doctorId - Doctor ID
   * @param {Object} dateRange - Start and end dates
   * @returns {Promise<Object>} Doctor performance data
   */
  async getDoctorPerformance(doctorId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange);

      const [
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalPatients,
        avgRating,
        avgConsultTime,
        totalRevenue,
        prescriptionRate
      ] = await Promise.all([
        prisma.appointment.count({
          where: {
            doctor_id: doctorId,
            startTs: { gte: startDate, lte: endDate }
          }
        }),
        prisma.appointment.count({
          where: {
            doctor_id: doctorId,
            status: 'COMPLETED',
            startTs: { gte: startDate, lte: endDate }
          }
        }),
        prisma.appointment.count({
          where: {
            doctor_id: doctorId,
            status: 'CANCELLED',
            startTs: { gte: startDate, lte: endDate }
          }
        }),
        prisma.appointment.findMany({
          where: {
            doctor_id: doctorId,
            startTs: { gte: startDate, lte: endDate }
          },
          distinct: ['patient_id']
        }).then(result => result.length),
        this.calculateDoctorAverageRating(doctorId, startDate, endDate),
        this.calculateAverageConsultTime(doctorId, startDate, endDate),
        this.calculateDoctorRevenue(doctorId, startDate, endDate),
        this.calculatePrescriptionRate(doctorId, startDate, endDate)
      ]);

      const completionRate = totalAppointments > 0 
        ? ((completedAppointments / totalAppointments) * 100).toFixed(2) 
        : 0;

      const cancellationRate = totalAppointments > 0 
        ? ((cancelledAppointments / totalAppointments) * 100).toFixed(2) 
        : 0;

      return {
        doctorId,
        period: { startDate, endDate },
        appointments: {
          total: totalAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments,
          completionRate,
          cancellationRate
        },
        patients: {
          total: totalPatients,
          averagePerDay: this.calculateAveragePerDay(totalPatients, startDate, endDate)
        },
        performance: {
          rating: avgRating,
          averageConsultTime: avgConsultTime,
          prescriptionRate
        },
        revenue: {
          total: totalRevenue,
          averagePerAppointment: completedAppointments > 0 
            ? (totalRevenue / completedAppointments).toFixed(2) 
            : 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting doctor performance:', error);
      throw error;
    }
  }

  /**
   * Get patient journey analytics
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Patient journey data
   */
  async getPatientJourney(patientId) {
    try {
      const appointments = await prisma.appointment.findMany({
        where: { patient_id: patientId },
        include: {
          doctor: { include: { user: true } },
          clinic: true,
          prescription: { include: { medications: true } }
        },
        orderBy: { startTs: 'asc' }
      });

      const journey = {
        patientId,
        totalAppointments: appointments.length,
        firstVisit: appointments[0]?.startTs || null,
        lastVisit: appointments[appointments.length - 1]?.startTs || null,
        visitedSpecialties: [...new Set(appointments.flatMap(a => a.doctor.specialties))],
        visitedClinics: [...new Set(appointments.map(a => a.clinic.name))],
        totalPrescriptions: appointments.filter(a => a.prescription).length,
        totalMedications: appointments.reduce((sum, a) => 
          sum + (a.prescription?.medications.length || 0), 0
        ),
        appointmentsByStatus: {
          completed: appointments.filter(a => a.status === 'COMPLETED').length,
          cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
          noShow: appointments.filter(a => a.status === 'NO_SHOW').length
        },
        timeline: appointments.map(apt => ({
          date: apt.startTs,
          doctor: apt.doctor.user.email, // Replace with actual name
          specialty: apt.doctor.specialties[0],
          clinic: apt.clinic.name,
          status: apt.status,
          hasPrescription: !!apt.prescription
        }))
      };

      return journey;
    } catch (error) {
      console.error('Error getting patient journey:', error);
      throw error;
    }
  }

  /**
   * Get appointment analytics for a date range
   * @param {Object} dateRange - Start and end dates
   * @returns {Promise<Object>} Appointment analytics
   */
  async getAppointmentAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange);

      const appointments = await prisma.appointment.findMany({
        where: {
          startTs: { gte: startDate, lte: endDate }
        },
        include: {
          doctor: true,
          clinic: true
        }
      });

      return {
        period: { startDate, endDate },
        total: appointments.length,
        byStatus: this.groupBy(appointments, 'status'),
        byVisitType: this.groupBy(appointments, 'visitType'),
        bySpecialty: this.groupBySpecialty(appointments),
        byClinic: this.groupByClinic(appointments),
        byDay: this.groupByDay(appointments, startDate, endDate),
        byHour: this.groupByHour(appointments),
        averagePerDay: this.calculateAveragePerDay(appointments.length, startDate, endDate),
        peakHours: this.findPeakHours(appointments),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting appointment analytics:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics
   * @param {Object} dateRange - Start and end dates
   * @returns {Promise<Object>} Revenue analytics
   */
  async getRevenueAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange);

      // Note: Assumes you have a payment/consultation fee field
      // This is placeholder logic - adjust based on your actual payment model
      const appointments = await prisma.appointment.findMany({
        where: {
          status: 'COMPLETED',
          startTs: { gte: startDate, lte: endDate }
        },
        include: {
          doctor: true,
          clinic: true
        }
      });

      // Placeholder fee calculation (would come from actual payment records)
      const AVERAGE_CONSULTATION_FEE = 500; // INR or your currency

      const totalRevenue = appointments.length * AVERAGE_CONSULTATION_FEE;

      return {
        period: { startDate, endDate },
        total: totalRevenue,
        byDoctor: await this.getRevenueByDoctor(appointments, AVERAGE_CONSULTATION_FEE),
        byClinic: await this.getRevenueByClinic(appointments, AVERAGE_CONSULTATION_FEE),
        byVisitType: await this.getRevenueByVisitType(appointments, AVERAGE_CONSULTATION_FEE),
        dailyRevenue: this.groupRevenueByDay(appointments, startDate, endDate, AVERAGE_CONSULTATION_FEE),
        averagePerAppointment: AVERAGE_CONSULTATION_FEE,
        totalAppointments: appointments.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      throw error;
    }
  }

  /**
   * Get user growth analytics
   * @param {Object} dateRange - Start and end dates
   * @returns {Promise<Object>} User growth data
   */
  async getUserGrowthAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange);

      const users = await prisma.user.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      });

      return {
        period: { startDate, endDate },
        total: users.length,
        byRole: this.groupBy(users, 'role'),
        dailyGrowth: this.groupByDay(users, startDate, endDate, 'createdAt'),
        averagePerDay: this.calculateAveragePerDay(users.length, startDate, endDate),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting user growth analytics:', error);
      throw error;
    }
  }

  /**
   * Get top performing doctors
   * @param {Object} options - Filters and limits
   * @returns {Promise<Array>} Top doctors with metrics
   */
  async getTopDoctors(options = {}) {
    const { limit = 10, metric = 'appointments', dateRange = {} } = options;
    const { startDate, endDate } = this.getDateRange(dateRange);

    try {
      const doctors = await prisma.doctor.findMany({
        where: { verifiedStatus: 'VERIFIED' },
        include: {
          user: true,
          appointments: {
            where: {
              status: 'COMPLETED',
              startTs: { gte: startDate, lte: endDate }
            }
          }
        }
      });

      // Sort by chosen metric
      const ranked = doctors.map(doctor => ({
        id: doctor.id,
        name: doctor.user.email, // Replace with actual name
        specialties: doctor.specialties,
        rating: doctor.rating,
        appointmentCount: doctor.appointments.length,
        score: this.calculateDoctorScore(doctor, metric)
      })).sort((a, b) => b.score - a.score);

      return ranked.slice(0, limit);
    } catch (error) {
      console.error('Error getting top doctors:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */

  getDateRange(range) {
    const endDate = range.endDate ? new Date(range.endDate) : new Date();
    const startDate = range.startDate 
      ? new Date(range.startDate) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    return { startDate, endDate };
  }

  groupBy(array, field) {
    const grouped = array.reduce((acc, item) => {
      const key = item[field];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return grouped;
  }

  groupBySpecialty(appointments) {
    const grouped = {};
    appointments.forEach(apt => {
      apt.doctor.specialties.forEach(specialty => {
        grouped[specialty] = (grouped[specialty] || 0) + 1;
      });
    });
    return grouped;
  }

  groupByClinic(appointments) {
    return this.groupBy(appointments.map(a => ({ ...a, clinic: a.clinic.name })), 'clinic');
  }

  groupByDay(items, startDate, endDate, dateField = 'startTs') {
    const daily = {};
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      daily[dateStr] = 0;
      current.setDate(current.getDate() + 1);
    }

    items.forEach(item => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      if (daily[date] !== undefined) {
        daily[date]++;
      }
    });

    return daily;
  }

  groupByHour(appointments) {
    const hourly = Array(24).fill(0);
    appointments.forEach(apt => {
      const hour = new Date(apt.startTs).getHours();
      hourly[hour]++;
    });
    return hourly;
  }

  findPeakHours(appointments) {
    const hourly = this.groupByHour(appointments);
    const sorted = hourly.map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);
    return sorted.slice(0, 3);
  }

  calculateAveragePerDay(total, startDate, endDate) {
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    return days > 0 ? (total / days).toFixed(2) : 0;
  }

  async calculateTotalRevenue() {
    // Placeholder - would query actual payment records
    const completedAppointments = await prisma.appointment.count({ 
      where: { status: 'COMPLETED' } 
    });
    return completedAppointments * 500; // Placeholder fee
  }

  async calculateUserGrowthRate() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });

    const totalUsers = await prisma.user.count();

    return totalUsers > 0 ? ((recentUsers / totalUsers) * 100).toFixed(2) : 0;
  }

  async calculateDoctorAverageRating(doctorId, startDate, endDate) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    return doctor?.rating || 0;
  }

  async calculateAverageConsultTime(doctorId, startDate, endDate) {
    const appointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctorId,
        status: 'COMPLETED',
        startTs: { gte: startDate, lte: endDate }
      }
    });

    if (appointments.length === 0) return 0;

    const totalTime = appointments.reduce((sum, apt) => {
      const duration = new Date(apt.endTs) - new Date(apt.startTs);
      return sum + duration / (1000 * 60); // Convert to minutes
    }, 0);

    return (totalTime / appointments.length).toFixed(2);
  }

  async calculateDoctorRevenue(doctorId, startDate, endDate) {
    const completedCount = await prisma.appointment.count({
      where: {
        doctor_id: doctorId,
        status: 'COMPLETED',
        startTs: { gte: startDate, lte: endDate }
      }
    });

    return completedCount * 500; // Placeholder fee
  }

  async calculatePrescriptionRate(doctorId, startDate, endDate) {
    const [total, withPrescription] = await Promise.all([
      prisma.appointment.count({
        where: {
          doctor_id: doctorId,
          status: 'COMPLETED',
          startTs: { gte: startDate, lte: endDate }
        }
      }),
      prisma.appointment.count({
        where: {
          doctor_id: doctorId,
          status: 'COMPLETED',
          startTs: { gte: startDate, lte: endDate },
          prescription: { isNot: null }
        }
      })
    ]);

    return total > 0 ? ((withPrescription / total) * 100).toFixed(2) : 0;
  }

  getRevenueByDoctor(appointments, fee) {
    const byDoctor = {};
    appointments.forEach(apt => {
      const doctorId = apt.doctor_id;
      byDoctor[doctorId] = (byDoctor[doctorId] || 0) + fee;
    });
    return byDoctor;
  }

  getRevenueByClinic(appointments, fee) {
    const byClinic = {};
    appointments.forEach(apt => {
      const clinicName = apt.clinic.name;
      byClinic[clinicName] = (byClinic[clinicName] || 0) + fee;
    });
    return byClinic;
  }

  getRevenueByVisitType(appointments, fee) {
    const byType = {};
    appointments.forEach(apt => {
      const type = apt.visitType;
      byType[type] = (byType[type] || 0) + fee;
    });
    return byType;
  }

  groupRevenueByDay(appointments, startDate, endDate, fee) {
    const daily = this.groupByDay(appointments, startDate, endDate);
    Object.keys(daily).forEach(date => {
      daily[date] = daily[date] * fee;
    });
    return daily;
  }

  calculateDoctorScore(doctor, metric) {
    switch (metric) {
      case 'appointments':
        return doctor.appointments.length;
      case 'rating':
        return doctor.rating * 100;
      case 'combined':
        return (doctor.appointments.length * 0.5) + (doctor.rating * 50);
      default:
        return doctor.appointments.length;
    }
  }

  /**
   * Cache helpers
   */
  async getCached(key) {
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  async cache(key, data, ttl) {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache error:', error);
    }
  }

  async clearCache(pattern = '*') {
    try {
      const keys = await redisClient.keys(`${this.CACHE_PREFIX}${pattern}`);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisClient.del(key)));
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

export default new AnalyticsService();

