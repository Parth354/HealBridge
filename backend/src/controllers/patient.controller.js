import triageService from '../services/triage.service.js';
import doctorService from '../services/doctor.service.js';
import bookingService from '../services/booking.service.js';
import ocrService from '../services/ocr.service.js';
import ragService from '../services/rag.service.js';
import prescriptionService from '../services/prescription.service.js';
import medicationService from '../services/medication.service.js';
import waitTimeService from '../services/waittime.service.js';
import firestoreService from '../services/firestore.service.js';
import syncService from '../services/sync.service.js';
import prisma from '../config/prisma.js';

class PatientController {
  // Get patient profile from Firebase Firestore
  async getProfile(req, res) {
    try {
      const firebaseUid = req.user?.firebaseUid || req.user?.firebase_uid;

      if (!firebaseUid) {
        return res.status(401).json({ 
          error: 'Firebase UID not found',
          message: 'Please authenticate with Firebase to access your profile'
        });
      }

      // Get patient profile from Firestore
      const firestoreProfile = await firestoreService.getPatientProfile(firebaseUid);

      if (!firestoreProfile) {
        // No profile in Firestore - return empty profile structure
        return res.json({
          success: true,
          profile: {
            firstName: '',
            lastName: '',
            email: req.user?.email || '',
            phoneNumber: '',
            dob: null,
            gender: null,
            address: null,
            allergies: [],
            conditions: [],
            emergencyContactName: null,
            emergencyContactPhone: null
          },
          hasFirestoreProfile: false,
          message: 'Profile not found in Firestore. Please complete your profile.'
        });
      }

      // Sync Firebase profile to Prisma Patient table (if not already synced)
      await syncService.syncFirebaseToPrismaPatient(firebaseUid);

      // Get unified profile (combines Firestore + Prisma data)
      const unifiedProfile = await syncService.syncPatientProfile(firebaseUid);

      res.json({
        success: true,
        profile: unifiedProfile.profile || firestoreProfile,
        hasFirestoreProfile: true,
        synced: unifiedProfile.synced || false
      });
    } catch (error) {
      console.error('Get patient profile error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update patient profile in Firestore and sync to Prisma
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

      // Sync Firebase profile to Prisma Patient table
      await syncService.syncFirebaseToPrismaPatient(firebaseUid);

      // Sync the updated profile (for cache)
      const syncedProfile = await syncService.syncPatientProfile(firebaseUid);

      res.json({ 
        success: true, 
        profile: syncedProfile,
        message: 'Profile updated and synced successfully'
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

      // Sync Firebase profile to Prisma Patient table
      await syncService.syncFirebaseToPrismaPatient(firebaseUid);

      // Sync profile (for cache)
      const syncedProfile = await syncService.syncPatientProfile(firebaseUid);

      res.json({ 
        success: true, 
        message: 'Profile synced successfully to Prisma',
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

  // Search doctors - no authentication required for browsing
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

      console.log('Searching doctors with filters:', filters);
      const doctors = await doctorService.searchDoctors(filters);
      console.log(`Found ${doctors.length} doctors`);
      
      res.json({ 
        success: true,
        doctors, 
        count: doctors.length,
        filters: filters
      });
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
        return res.status(400).json({ error: 'Date is required', code: 'DATE_REQUIRED' });
      }

      if (!doctorId) {
        return res.status(400).json({ error: 'Doctor ID is required', code: 'DOCTOR_ID_REQUIRED' });
      }

      if (!clinicId) {
        return res.status(400).json({ error: 'Clinic ID is required', code: 'CLINIC_ID_REQUIRED' });
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD', code: 'INVALID_DATE_FORMAT' });
      }

      const availability = await doctorService.getDoctorAvailability(
        doctorId,
        clinicId,
        date
      );
      
      // Ensure response always has availableSlots array (even if empty)
      if (!availability.availableSlots) {
        availability.availableSlots = [];
      }
      
      res.json(availability);
    } catch (error) {
      console.error('Get availability error:', error);
      
      // Handle specific errors
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return res.status(404).json({ error: error.message, code: 'NOT_FOUND' });
      }
      
      res.status(500).json({ error: error.message || 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }

  // Create slot hold
  async createSlotHold(req, res) {
    try {
      let patientId = req.user.patientId;
      const firebaseUid = req.user.firebaseUid;
      
      // If patientId is missing, try to sync from Firestore
      if (!patientId && firebaseUid) {
        try {
          await syncService.syncFirebaseToPrismaPatient(firebaseUid);
          // Refresh user to get patientId
          const user = await prisma.user.findUnique({
            where: { firebase_uid: firebaseUid },
            include: { patient: true }
          });
          patientId = user?.patient?.id;
        } catch (error) {
          console.error('Error syncing patient profile:', error);
        }
      }
      
      if (!patientId) {
        return res.status(403).json({ 
          error: 'Patient profile required',
          message: 'Please complete your profile before booking an appointment'
        });
      }
      
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
      let patientId = req.user.patientId;
      const firebaseUid = req.user.firebaseUid;
      
      // If patientId is missing, try to sync from Firestore
      if (!patientId && firebaseUid) {
        try {
          await syncService.syncFirebaseToPrismaPatient(firebaseUid);
          // Refresh user to get patientId
          const user = await prisma.user.findUnique({
            where: { firebase_uid: firebaseUid },
            include: { patient: true }
          });
          patientId = user?.patient?.id;
        } catch (error) {
          console.error('Error syncing patient profile:', error);
        }
      }
      
      if (!patientId) {
        return res.status(403).json({ 
          error: 'Patient profile required',
          message: 'Please complete your profile before confirming appointment'
        });
      }
      
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
      let patientId = req.user.patientId;
      const firebaseUid = req.user.firebaseUid;
      const { status } = req.query;

      // If patientId is missing, try to sync from Firestore
      if (!patientId && firebaseUid) {
        try {
          await syncService.syncFirebaseToPrismaPatient(firebaseUid);
          // Refresh user to get patientId
          const user = await prisma.user.findUnique({
            where: { firebase_uid: firebaseUid },
            include: { patient: true }
          });
          patientId = user?.patient?.id;
        } catch (error) {
          console.error('Error syncing patient profile:', error);
        }
      }

      if (!patientId) {
        // Return empty appointments if no profile exists
        return res.json({ 
          appointments: [], 
          count: 0,
          message: 'No patient profile found. Please complete your profile.'
        });
      }

      try {
        const appointments = await bookingService.getPatientAppointments(
          patientId,
          status
        );
        res.json({ appointments, count: appointments.length });
      } catch (bookingError) {
        // Return empty appointments on error
        console.log('Error getting appointments:', bookingError.message);
        res.json({ 
          appointments: [], 
          count: 0,
          message: 'No appointments found'
        });
      }
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Check-in for appointment
  async checkIn(req, res) {
    try {
      let patientId = req.user.patientId;
      const firebaseUid = req.user.firebaseUid;
      const { appointmentId } = req.params;

      // If patientId is missing, try to sync from Firestore
      if (!patientId && firebaseUid) {
        try {
          await syncService.syncFirebaseToPrismaPatient(firebaseUid);
          const user = await prisma.user.findUnique({
            where: { firebase_uid: firebaseUid },
            include: { patient: true }
          });
          patientId = user?.patient?.id;
        } catch (error) {
          console.error('Error syncing patient profile:', error);
        }
      }

      if (!patientId) {
        return res.status(403).json({ 
          error: 'Patient profile required',
          message: 'Please complete your profile'
        });
      }

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
      let patientId = req.user.patientId;
      const firebaseUid = req.user.firebaseUid;
      const file = req.file;
      const { docType } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'File is required' });
      }

      // If patientId is missing, try to sync from Firestore
      if (!patientId && firebaseUid) {
        try {
          await syncService.syncFirebaseToPrismaPatient(firebaseUid);
          const user = await prisma.user.findUnique({
            where: { firebase_uid: firebaseUid },
            include: { patient: true }
          });
          patientId = user?.patient?.id;
        } catch (error) {
          console.error('Error syncing patient profile:', error);
        }
      }

      if (!patientId) {
        return res.status(403).json({ 
          error: 'Patient profile required',
          message: 'Please complete your profile before uploading documents'
        });
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
      let patientId = req.user.patientId;
      const firebaseUid = req.user.firebaseUid;

      // If patientId is missing, try to sync from Firestore
      if (!patientId && firebaseUid) {
        try {
          await syncService.syncFirebaseToPrismaPatient(firebaseUid);
          const user = await prisma.user.findUnique({
            where: { firebase_uid: firebaseUid },
            include: { patient: true }
          });
          patientId = user?.patient?.id;
        } catch (error) {
          console.error('Error syncing patient profile:', error);
        }
      }

      if (!patientId) {
        return res.status(403).json({ 
          error: 'Patient profile required',
          message: 'Please complete your profile'
        });
      }

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
      let patientId = req.user.patientId;
      const firebaseUid = req.user.firebaseUid;

      // If patientId is missing, try to sync from Firestore
      if (!patientId && firebaseUid) {
        try {
          await syncService.syncFirebaseToPrismaPatient(firebaseUid);
          const user = await prisma.user.findUnique({
            where: { firebase_uid: firebaseUid },
            include: { patient: true }
          });
          patientId = user?.patient?.id;
        } catch (error) {
          console.error('Error syncing patient profile:', error);
        }
      }

      if (!patientId) {
        return res.json({ prescriptions: [], count: 0, message: 'No patient profile found' });
      }

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
      let patientId = req.user.patientId;
      const firebaseUid = req.user.firebaseUid;

      // If patientId is missing, try to sync from Firestore
      if (!patientId && firebaseUid) {
        try {
          await syncService.syncFirebaseToPrismaPatient(firebaseUid);
          const user = await prisma.user.findUnique({
            where: { firebase_uid: firebaseUid },
            include: { patient: true }
          });
          patientId = user?.patient?.id;
        } catch (error) {
          console.error('Error syncing patient profile:', error);
        }
      }

      if (!patientId) {
        return res.json({ reminders: [], count: 0, message: 'No patient profile found' });
      }

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
      let patientId = req.user.patientId;
      const firebaseUid = req.user.firebaseUid;

      // If patientId is missing, try to sync from Firestore
      if (!patientId && firebaseUid) {
        try {
          await syncService.syncFirebaseToPrismaPatient(firebaseUid);
          const user = await prisma.user.findUnique({
            where: { firebase_uid: firebaseUid },
            include: { patient: true }
          });
          patientId = user?.patient?.id;
        } catch (error) {
          console.error('Error syncing patient profile:', error);
        }
      }

      if (!patientId) {
        return res.json({ reminders: [], count: 0, message: 'No patient profile found' });
      }

      const reminders = await medicationService.getRefillReminders(patientId);
      res.json({ reminders, count: reminders.length });
    } catch (error) {
      console.error('Get refill reminders error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new PatientController();

