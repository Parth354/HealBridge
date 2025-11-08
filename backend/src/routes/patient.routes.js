import express from 'express';
const router = express.Router();
import patientController from '../controllers/patient.controller.js';
import { authenticate, requirePatientProfile } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';
import upload from '../middleware/upload.middleware.js';

// All routes require authentication
router.use(authenticate);

// Test authentication (no profile required)
router.get('/test/auth', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: {
      userId: req.user.userId,
      role: req.user.role,
      phone: req.user.phone,
      email: req.user.email,
      hasPatientProfile: !!req.user.patientId
    }
  });
});

// Patient profile (from Prisma)
router.get('/profile', patientController.getProfile);
router.put('/profile', patientController.updateProfile);

// Triage (no profile required)
router.post('/triage/analyze', patientController.analyzeSyptoms);
router.get('/triage/categories', patientController.getCategories);

// Doctor search (no profile required)
router.get('/doctors/search', patientController.searchDoctors);
router.get('/doctors/:doctorId/clinics/:clinicId/availability', patientController.getDoctorAvailability);

// Booking (requires patient profile)
router.post('/bookings/hold', requirePatientProfile, validate(schemas.createSlotHold), patientController.createSlotHold);
router.post('/bookings/confirm', requirePatientProfile, validate(schemas.confirmAppointment), patientController.confirmAppointment);
router.get('/appointments', requirePatientProfile, patientController.getAppointments);
router.post('/appointments/:appointmentId/checkin', requirePatientProfile, patientController.checkIn);
router.delete('/appointments/:appointmentId', requirePatientProfile, patientController.cancelAppointment);

// Wait time
router.get('/appointments/:appointmentId/waittime', patientController.getWaitTime);

// Documents & OCR
router.post('/documents/upload', upload.single('file'), patientController.uploadDocument);

// Patient summary
router.get('/summary', patientController.getPatientSummary);

// Prescriptions
router.get('/prescriptions', patientController.getPrescriptions);

// Medications
router.get('/medications/reminders', patientController.getMedicationReminders);
router.get('/medications/refills', patientController.getRefillReminders);
router.post('/medications/:medicationId/reminders/enable', patientController.enableMedicationReminders);
router.post('/medications/:medicationId/taken', patientController.markMedicationTaken);

export default router;

