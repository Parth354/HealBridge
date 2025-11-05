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
}

export default new DoctorController();

