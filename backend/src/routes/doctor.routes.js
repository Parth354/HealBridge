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

// Routes below require verified doctor
router.use(requireVerifiedDoctor);

// Schedule management
router.post('/schedule', validate(schemas.createSchedule), doctorController.createSchedule);
router.post('/schedule/recurring', validate(schemas.createRecurringSchedule), doctorController.createRecurringSchedule);
router.post('/schedule/unavailable', doctorController.markUnavailable);
router.get('/schedule', doctorController.getSchedule);

// Appointments
router.get('/appointments', doctorController.getAppointments);
router.post('/appointments/:appointmentId/start', doctorController.startConsultation);
router.post('/appointments/:appointmentId/end', doctorController.endConsultation);

// Patient context & RAG
router.get('/appointments/:appointmentId/patient-context', doctorController.getPatientContext);
router.post('/patients/:patientId/query', doctorController.queryPatientHistory);

// Prescriptions
router.post('/prescriptions', validate(schemas.createPrescription), doctorController.createPrescription);

// Analytics
router.get('/statistics', doctorController.getStatistics);
router.get('/status', doctorController.getStatus);

// Emergency
router.post('/emergency/leave', validate(schemas.emergencyLeave), doctorController.handleEmergencyLeave);

// Wait time management
router.post('/waittime/update', doctorController.updateWaitTimeFactors);

export default router;

