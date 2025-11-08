import express from 'express';
const router = express.Router();
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';

// Public routes
// OTP routes for PATIENTS, DOCTORS, and STAFF
router.post('/otp/send', validate(schemas.sendOTP), authController.sendOTP);
router.post('/otp/verify', validate(schemas.verifyOTP), authController.verifyOTP);

// Protected routes
router.use(authenticate);

router.get('/me', authController.getCurrentUser);
router.post('/patient/profile', validate(schemas.createPatientProfile), authController.createPatientProfile);
// Create doctor profile - requires validation
router.post('/doctor/profile', validate(schemas.createDoctorProfile), authController.createDoctorProfile);
router.put('/language', authController.updateLanguage);

export default router;

