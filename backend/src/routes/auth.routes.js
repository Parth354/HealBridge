import express from 'express';
const router = express.Router();
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';

// Public routes
// OTP routes are now for DOCTORS/STAFF only
router.post('/otp/send', validate(schemas.sendOTP), authController.sendOTP); // Doctors/Staff only
router.post('/otp/verify', validate(schemas.verifyOTP), authController.verifyOTP); // Doctors/Staff only

// Firebase authentication routes (public) - PATIENTS ONLY
router.post('/firebase/login', authController.authenticateWithFirebase);

// Protected routes
router.use(authenticate);

router.get('/me', authController.getCurrentUser);
router.post('/patient/profile', authController.createPatientProfile); // DEPRECATED - Returns 410
router.post('/doctor/profile', validate(schemas.createDoctorProfile), authController.createDoctorProfile);
router.put('/language', authController.updateLanguage);

// Firebase sync route (protected)
router.post('/firebase/sync', authController.syncFirebaseUser);

export default router;

