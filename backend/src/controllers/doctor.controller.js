import scheduleService from '../services/schedule.service.js';
import bookingService from '../services/booking.service.js';
import prescriptionService from '../services/prescription.service.js';
import ragService from '../services/rag.service.js';
import waitTimeService from '../services/waittime.service.js';
import licenseService from '../services/license.service.js';
import emergencyService from '../services/emergency.service.js';
import prisma from '../config/prisma.js';

class DoctorController {
  // Create schedule block
  async createSchedule(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const scheduleData = { ...req.body, doctorId };

      const schedule = await scheduleService.createScheduleBlock(scheduleData);
      res.json({ success: true, schedule });
    } catch (error) {
      console.error('Create schedule error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Create recurring schedule
  async createRecurringSchedule(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const scheduleData = { ...req.body, doctorId };

      const result = await scheduleService.createRecurringSchedule(scheduleData);
      res.json(result);
    } catch (error) {
      console.error('Create recurring schedule error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Mark unavailable (break/holiday)
  async markUnavailable(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const { startTs, endTs, type } = req.body;

      const schedule = await scheduleService.markUnavailable(
        doctorId,
        startTs,
        endTs,
        type
      );

      res.json({ success: true, schedule });
    } catch (error) {
      console.error('Mark unavailable error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get doctor's schedule
  async getSchedule(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates are required' });
      }

      const schedule = await scheduleService.getDoctorSchedule(
        doctorId,
        startDate,
        endDate
      );

      res.json(schedule);
    } catch (error) {
      console.error('Get schedule error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update schedule block
  async updateSchedule(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const { blockId } = req.params;
      const updates = req.body;

      const schedule = await scheduleService.updateScheduleBlock(blockId, doctorId, updates);
      res.json({ success: true, schedule });
    } catch (error) {
      console.error('Update schedule error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Delete schedule block
  async deleteSchedule(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const { blockId } = req.params;

      await scheduleService.deleteScheduleBlock(blockId, doctorId);
      res.json({ success: true, message: 'Schedule block deleted successfully' });
    } catch (error) {
      console.error('Delete schedule error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get doctor's appointments
  async getAppointments(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const { date } = req.query;

      const appointments = await bookingService.getDoctorAppointments(
        doctorId,
        date
      );

      res.json({ appointments, count: appointments.length });
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Start consultation
  async startConsultation(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const { appointmentId } = req.params;

      const appointment = await bookingService.startConsultation(
        appointmentId,
        doctorId
      );

      res.json({ success: true, appointment });
    } catch (error) {
      console.error('Start consultation error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // End consultation
  async endConsultation(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const { appointmentId } = req.params;

      const appointment = await bookingService.endConsultation(
        appointmentId,
        doctorId
      );

      res.json({ success: true, appointment });
    } catch (error) {
      console.error('End consultation error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get patient summary for appointment
  async getPatientContext(req, res) {
    try {
      const { appointmentId } = req.params;

      // Get appointment
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: true
        }
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Get patient summary
      const summary = await ragService.generatePatientSummary(
        appointment.patient_id
      );

      res.json(summary);
    } catch (error) {
      console.error('Get patient context error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Query patient history (RAG)
  async queryPatientHistory(req, res) {
    try {
      const { patientId } = req.params;
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const result = await ragService.queryPatientHistory(patientId, query);
      res.json(result);
    } catch (error) {
      console.error('Query patient history error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create prescription
  async createPrescription(req, res) {
    try {
      const prescriptionData = req.body;

      const result = await prescriptionService.createPrescription(prescriptionData);
      res.json(result);
    } catch (error) {
      console.error('Create prescription error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get doctor statistics
  async getStatistics(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Get appointments
      const appointments = await prisma.appointment.findMany({
        where: {
          doctor_id: doctorId,
          startTs: { gte: start, lte: end }
        }
      });

      const stats = {
        totalAppointments: appointments.length,
        completed: appointments.filter(a => a.status === 'COMPLETED').length,
        cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
        noShows: appointments.filter(a => a.status === 'CANCELLED' && !a.checkedInAt).length,
        avgConsultTime: 0,
        revenue: appointments.reduce((sum, a) => sum + (a.feeMock || 0), 0)
      };

      // Calculate average consult time
      const completedWithTimes = appointments.filter(
        a => a.consultStartedAt && a.consultEndedAt
      );

      if (completedWithTimes.length > 0) {
        const totalMinutes = completedWithTimes.reduce((sum, a) => {
          return sum + (a.consultEndedAt - a.consultStartedAt) / (1000 * 60);
        }, 0);
        stats.avgConsultTime = Math.round(totalMinutes / completedWithTimes.length);
      }

      res.json({ stats, period: { start, end } });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get current status
  async getStatus(req, res) {
    try {
      const doctorId = req.user.doctorId;

      const status = await waitTimeService.getDoctorStatus(doctorId);
      res.json(status);
    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Request license verification
  async requestLicenseVerification(req, res) {
    try {
      const doctorId = req.user.doctorId;

      const result = await licenseService.requestVerification(doctorId);
      res.json(result);
    } catch (error) {
      console.error('Request verification error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get license verification status
  async getVerificationStatus(req, res) {
    try {
      const doctorId = req.user.doctorId;

      const status = await licenseService.getVerificationStatus(doctorId);
      res.json(status);
    } catch (error) {
      console.error('Get verification status error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Handle emergency leave
  async handleEmergencyLeave(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const { startTime, endTime, reason } = req.body;

      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'Start and end times are required' });
      }

      const result = await emergencyService.handleEmergencyLeave(
        doctorId,
        startTime,
        endTime,
        reason
      );

      res.json(result);
    } catch (error) {
      console.error('Handle emergency leave error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Update wait time factors
  async updateWaitTimeFactors(req, res) {
    try {
      const doctorId = req.user.doctorId;

      const result = await waitTimeService.updateOverrunFactors(doctorId);
      res.json(result);
    } catch (error) {
      console.error('Update wait time factors error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Add clinic
  async addClinic(req, res) {
    try {
      const doctorId = req.user.doctorId;
      const { name, lat, lon, address, houseVisitRadiusKm } = req.body;

      const clinic = await prisma.clinic.create({
        data: {
          doctor_id: doctorId,
          name,
          lat,
          lon,
          address,
          houseVisitRadiusKm: houseVisitRadiusKm || 5
        }
      });

      res.json({ success: true, clinic });
    } catch (error) {
      console.error('Add clinic error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get clinics
  async getClinics(req, res) {
    try {
      const doctorId = req.user.doctorId;

      const clinics = await prisma.clinic.findMany({
        where: { doctor_id: doctorId }
      });

      res.json({ clinics, count: clinics.length });
    } catch (error) {
      console.error('Get clinics error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get doctor profile
  async getProfile(req, res) {
    try {
      const doctorId = req.user.doctorId;

      if (!doctorId) {
        return res.status(403).json({ 
          error: 'Doctor profile required',
          message: 'Please complete your doctor profile setup',
          code: 'DOCTOR_PROFILE_REQUIRED'
        });
      }

      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        include: {
          user: {
            select: {
              phone: true,
              email: true,
              verified: true
            }
          },
          clinics: true
        }
      });

      if (!doctor) {
        return res.status(404).json({ 
          error: 'Doctor profile not found',
          message: 'Doctor profile not found. Please create your profile.',
          code: 'DOCTOR_PROFILE_NOT_FOUND'
        });
      }

      res.json({ success: true, doctor });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update doctor profile
  async updateProfile(req, res) {
    try {
      const doctorId = req.user.doctorId;

      if (!doctorId) {
        return res.status(403).json({ 
          error: 'Doctor profile required',
          message: 'Please create your doctor profile first',
          code: 'DOCTOR_PROFILE_REQUIRED'
        });
      }

      const { firstName, lastName, specialties, email } = req.body;

      // Validate input
      if (firstName !== undefined && (!firstName || firstName.trim().length < 1)) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: 'First name must be at least 1 character',
          details: [{ field: 'firstName', message: 'First name is required and must be at least 1 character' }]
        });
      }

      if (lastName !== undefined && (!lastName || lastName.trim().length < 1)) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: 'Last name must be at least 1 character',
          details: [{ field: 'lastName', message: 'Last name is required and must be at least 1 character' }]
        });
      }

      if (specialties !== undefined) {
        if (!Array.isArray(specialties) || specialties.length === 0) {
          return res.status(400).json({ 
            error: 'Validation failed',
            message: 'Specialties must be a non-empty array',
            details: [{ field: 'specialties', message: 'At least one specialty is required' }]
          });
        }
      }

      if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: 'Invalid email format',
          details: [{ field: 'email', message: 'Email must be a valid email address' }]
        });
      }

      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName.trim();
      if (lastName !== undefined) updateData.lastName = lastName.trim();
      if (specialties !== undefined) updateData.specialties = specialties;

      const doctor = await prisma.doctor.update({
        where: { id: doctorId },
        data: updateData,
        include: {
          user: true
        }
      });

      // Update email in user table if provided
      if (email && email !== doctor.user.email) {
        await prisma.user.update({
          where: { id: doctor.user_id },
          data: { email: email.trim() }
        });
      }

      // Refresh doctor data to include updated email
      const updatedDoctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        include: {
          user: {
            select: {
              phone: true,
              email: true,
              verified: true
            }
          },
          clinics: true
        }
      });

      res.json({ success: true, doctor: updatedDoctor });
    } catch (error) {
      console.error('Update profile error:', error);
      
      // Handle Prisma errors
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          error: 'Doctor profile not found',
          message: 'Doctor profile not found. Please create your profile first.'
        });
      }
      
      res.status(400).json({ 
        error: error.message || 'Failed to update profile',
        message: error.message || 'Failed to update profile'
      });
    }
  }

  // Update verification status (for admin/testing)
  async updateVerificationStatus(req, res) {
    try {
      const { doctorId } = req.params;
      const { status } = req.body;

      if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const doctor = await prisma.doctor.update({
        where: { id: doctorId },
        data: { verifiedStatus: status },
        include: {
          user: true
        }
      });

      res.json({ success: true, doctor, message: `Verification status updated to ${status}` });
    } catch (error) {
      console.error('Update verification status error:', error);
      res.status(400).json({ error: error.message });
    }
  }
}

export default new DoctorController();

