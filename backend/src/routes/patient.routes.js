import express from 'express';
const router = express.Router();
import patientController from '../controllers/patient.controller.js';
import { authenticate, requirePatientProfile } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';
import upload from '../middleware/upload.middleware.js';

// All routes require authentication
router.use(authenticate);

// Patient profile (from Firestore)
router.get('/profile', patientController.getProfile);
router.put('/profile', patientController.updateProfile);

// Triage (no profile required)
router.post('/triage/analyze', patientController.analyzeSyptoms);
router.get('/triage/categories', patientController.getCategories);

// Doctor search (no profile required)
router.get('/doctors/search', patientController.searchDoctors);
router.get('/doctors/:doctorId/clinics/:clinicId/availability', patientController.getDoctorAvailability);

// Booking (requires profile in Firestore - checked in controller)
router.post('/bookings/hold', validate(schemas.createSlotHold), patientController.createSlotHold);
router.post('/bookings/confirm', validate(schemas.confirmAppointment), patientController.confirmAppointment);
router.get('/appointments', patientController.getAppointments);
router.post('/appointments/:appointmentId/checkin', patientController.checkIn);
router.delete('/appointments/:appointmentId', patientController.cancelAppointment);

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

