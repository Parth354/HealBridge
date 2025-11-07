import express from 'express';
const router = express.Router();
import doctorController from '../controllers/doctor.controller.js';
import { authenticate, requireDoctorProfile, requireVerifiedDoctor } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';

// All routes require authentication and doctor profile
router.use(authenticate);
router.use(requireDoctorProfile);

// License verification (doesn't require verified status)
router.post('/verification/request', doctorController.requestLicenseVerification);
router.get('/verification/status', doctorController.getVerificationStatus);

// Clinic management (doesn't require verified status)
router.post('/clinics', validate(schemas.addClinic), doctorController.addClinic);
router.get('/clinics', doctorController.getClinics);

// Schedule management (temporarily allow without verification)
router.post('/schedule', validate(schemas.createSchedule), doctorController.createSchedule);
router.post('/schedule/recurring', validate(schemas.createRecurringSchedule), doctorController.createRecurringSchedule);
router.post('/schedule/unavailable', doctorController.markUnavailable);
router.get('/schedule', doctorController.getSchedule);

// Appointments (temporarily allow without verification)
router.get('/appointments', doctorController.getAppointments);
router.post('/appointments/:appointmentId/start', doctorController.startConsultation);
router.post('/appointments/:appointmentId/end', doctorController.endConsultation);

// Analytics (temporarily allow without verification)
router.get('/statistics', doctorController.getStatistics);
router.get('/status', doctorController.getStatus);

// Emergency (allow without verification for urgent situations)
router.post('/emergency/leave', validate(schemas.emergencyLeave), doctorController.handleEmergencyLeave);

// Routes below require verified doctor (critical operations only)
router.use(requireVerifiedDoctor);

// Patient context & RAG (requires verification)
router.get('/appointments/:appointmentId/patient-context', doctorController.getPatientContext);
router.post('/patients/:patientId/query', doctorController.queryPatientHistory);

// Prescriptions (requires verification)
router.post('/prescriptions', validate(schemas.createPrescription), doctorController.createPrescription);

// Wait time management
router.post('/waittime/update', doctorController.updateWaitTimeFactors);

export default router;

