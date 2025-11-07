import triageService from '../services/triage.service.js';
import doctorService from '../services/doctor.service.js';
import bookingService from '../services/booking.service.js';
import ocrService from '../services/ocr.service.js';
import ragService from '../services/rag.service.js';
import prescriptionService from '../services/prescription.service.js';
import medicationService from '../services/medication.service.js';
import waitTimeService from '../services/waittime.service.js';
import firestoreService from '../services/firestore.service.js';
import syncService from '../services/sync.service.js'; // New import

class PatientController {
  // Get patient profile from Firestore with sync
  async getProfile(req, res) {
    try {
      const firebaseUid = req.user.firebaseUid;

      if (!firebaseUid) {
        return res.status(400).json({ 
          error: 'Firebase UID not found. Please re-authenticate with Firebase.' 
        });
      }

      // Use sync service for unified profile view
      const syncedProfile = await syncService.syncPatientProfile(firebaseUid);

      if (!syncedProfile || !syncedProfile.hasFirestoreProfile) {
        return res.status(404).json({ 
          error: 'Profile not found',
          message: 'Please complete your profile in the mobile app.',
          userId: req.user.userId
        });
      }

      res.json({ 
        success: true, 
        profile: syncedProfile,
        synced: true
      });
    } catch (error) {
      console.error('Get patient profile error:', error);
      
      // Fallback to direct Firestore query if sync fails
      try {
        const profile = await firestoreService.getPatientProfile(req.user.firebaseUid);
        return res.json({ 
          success: true, 
          profile, 
          synced: false,
          warning: 'Profile retrieved without full sync'
        });
      } catch (fallbackError) {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Update patient profile in Firestore and invalidate cache
  async updateProfile(req, res) {
    try {
      const firebaseUid = req.user.firebaseUid;

      if (!firebaseUid) {
        return res.status(400).json({ 
          error: 'Firebase UID not found. Please re-authenticate with Firebase.' 
        });
      }

      const profileData = req.body;
      
      // Validate required fields
      if (profileData.firstName || profileData.lastName) {
        if (!profileData.firstName || profileData.firstName.trim().length < 2) {
          return res.status(400).json({ error: 'First name must be at least 2 characters' });
        }
        if (!profileData.lastName || profileData.lastName.trim().length < 2) {
          return res.status(400).json({ error: 'Last name must be at least 2 characters' });
        }
      }

      // Update in Firestore
      const profile = await firestoreService.updatePatientProfile(firebaseUid, profileData);

      // Invalidate cache to force fresh sync
      await syncService.invalidateUserCache(firebaseUid);

      // Sync the updated profile
      const syncedProfile = await syncService.syncPatientProfile(firebaseUid);

      res.json({ 
        success: true, 
        profile: syncedProfile,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update patient profile error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get complete patient data (profile + appointments + medications + documents)
  async getCompleteData(req, res) {
    try {
      const firebaseUid = req.user.firebaseUid;

      if (!firebaseUid) {
        return res.status(400).json({ 
          error: 'Firebase UID not found. Please re-authenticate with Firebase.' 
        });
      }

      const completeData = await syncService.getCompletePatientData(firebaseUid);

      if (!completeData) {
        return res.status(404).json({ 
          error: 'Patient data not found' 
        });
      }

      res.json({ 
        success: true, 
        data: completeData 
      });
    } catch (error) {
      console.error('Get complete patient data error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Force profile sync (useful after mobile app updates profile)
  async forceSync(req, res) {
    try {
      const firebaseUid = req.user.firebaseUid;

      if (!firebaseUid) {
        return res.status(400).json({ 
          error: 'Firebase UID not found. Please re-authenticate with Firebase.' 
        });
      }

      // Invalidate cache
      await syncService.invalidateUserCache(firebaseUid);

      // Sync profile
      const syncedProfile = await syncService.syncPatientProfile(firebaseUid);

      res.json({ 
        success: true, 
        message: 'Profile synced successfully',
        profile: syncedProfile
      });
    } catch (error) {
      console.error('Force sync error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Triage: Analyze symptoms
  async analyzeSyptoms(req, res) {
    try {
      const { symptoms } = req.body;

      if (!symptoms) {
        return res.status(400).json({ error: 'Symptoms are required' });
      }

      const result = await triageService.analyzeSymptomsSimple(symptoms);
      res.json(result);
    } catch (error) {
      console.error('Symptom analysis error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get triage categories
  async getCategories(req, res) {
    try {
      const categories = triageService.getCategories();
      res.json({ categories });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Search doctors
  async searchDoctors(req, res) {
    try {
      const filters = {
        specialty: req.query.specialty,
        lat: parseFloat(req.query?.lat),
        lon: parseFloat(req.query?.lon),
        visitType: req.query?.visitType,
        sortBy: req.query?.sortBy || 'distance',
        maxDistance: parseInt(req.query?.maxDistance) || 50,
        minRating: parseFloat(req.query?.minRating) || 0,
        limit: parseInt(req.query?.limit) || 20
      };

      const doctors = await doctorService.searchDoctors(filters);
      res.json({ doctors, count: doctors.length });
    } catch (error) {
      console.error('Search doctors error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get doctor availability
  async getDoctorAvailability(req, res) {
    try {
      const { doctorId, clinicId } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }

      const availability = await doctorService.getDoctorAvailability(
        doctorId,
        clinicId,
        date
      );
      res.json(availability);
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create slot hold
  async createSlotHold(req, res) {
    try {
      const patientId = req.user.patientId;
      const { doctorId, clinicId, startTs, endTs } = req.body;

      if (!doctorId || !clinicId || !startTs || !endTs) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const hold = await bookingService.createSlotHold({
        doctorId,
        clinicId,
        patientId,
        startTs,
        endTs
      });

      res.json(hold);
    } catch (error) {
      console.error('Create slot hold error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Confirm appointment
  async confirmAppointment(req, res) {
    try {
      const patientId = req.user.patientId;
      const { holdId, visitType, address, feeMock } = req.body;

      if (!holdId) {
        return res.status(400).json({ error: 'Hold ID is required' });
      }

      const appointment = await bookingService.confirmAppointment({
        holdId,
        patientId,
        visitType,
        address,
        feeMock
      });

      res.json({ success: true, appointment });
    } catch (error) {
      console.error('Confirm appointment error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get patient appointments
  async getAppointments(req, res) {
    try {
      const patientId = req.user.patientId;
      const { status } = req.query;

      const appointments = await bookingService.getPatientAppointments(
        patientId,
        status
      );
      res.json({ appointments, count: appointments.length });
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Check-in for appointment
  async checkIn(req, res) {
    try {
      const patientId = req.user.patientId;
      const { appointmentId } = req.params;

      const appointment = await bookingService.checkIn(appointmentId, patientId);
      res.json({ success: true, appointment });
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get wait time estimate
  async getWaitTime(req, res) {
    try {
      const { appointmentId } = req.params;

      const estimate = await waitTimeService.getWaitEstimate(appointmentId);
      res.json(estimate);
    } catch (error) {
      console.error('Get wait time error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Upload document (prescription, lab report)
  async uploadDocument(req, res) {
    try {
      const patientId = req.user.patientId;
      const file = req.file;
      const { docType } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const result = await ocrService.processDocument(
        file,
        patientId,
        docType || 'PRESCRIPTION'
      );

      res.json(result);
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get patient summary
  async getPatientSummary(req, res) {
    try {
      const patientId = req.user.patientId;

      const summary = await ragService.generatePatientSummary(patientId);
      res.json(summary);
    } catch (error) {
      console.error('Get patient summary error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get prescriptions
  async getPrescriptions(req, res) {
    try {
      const patientId = req.user.patientId;

      const prescriptions = await prescriptionService.getPatientPrescriptions(patientId);
      res.json({ prescriptions, count: prescriptions.length });
    } catch (error) {
      console.error('Get prescriptions error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get medication reminders
  async getMedicationReminders(req, res) {
    try {
      const patientId = req.user.patientId;

      const reminders = await medicationService.getTodayReminders(patientId);
      res.json({ reminders, count: reminders.length });
    } catch (error) {
      console.error('Get medication reminders error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Enable medication reminders
  async enableMedicationReminders(req, res) {
    try {
      const { medicationId } = req.params;
      const { customSchedule } = req.body;

      const result = await medicationService.createMedicationSchedule(
        medicationId,
        customSchedule
      );

      res.json(result);
    } catch (error) {
      console.error('Enable medication reminders error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Mark medication as taken
  async markMedicationTaken(req, res) {
    try {
      const { medicationId } = req.params;
      const { takenAt } = req.body;

      const result = await medicationService.markMedicationTaken(
        medicationId,
        takenAt ? new Date(takenAt) : new Date()
      );

      res.json(result);
    } catch (error) {
      console.error('Mark medication taken error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Cancel appointment
  async cancelAppointment(req, res) {
    try {
      const userId = req.user.userId;
      const { appointmentId } = req.params;

      const appointment = await bookingService.cancelAppointment(appointmentId, userId);
      res.json({ success: true, appointment });
    } catch (error) {
      console.error('Cancel appointment error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get refill reminders
  async getRefillReminders(req, res) {
    try {
      const patientId = req.user.patientId;

      const reminders = await medicationService.getRefillReminders(patientId);
      res.json({ reminders, count: reminders.length });
    } catch (error) {
      console.error('Get refill reminders error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new PatientController();

