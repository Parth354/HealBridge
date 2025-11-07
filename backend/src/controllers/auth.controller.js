import authService from '../services/auth.service.js';

class AuthController {
  // Send OTP to phone number (DOCTORS/STAFF ONLY)
  async sendOTP(req, res) {
    try {
      let { phone, role } = req.body;
      
      // Block patient OTP requests
      if (role === 'PATIENT') {
        return res.status(403).json({ 
          error: 'Patient login via OTP is disabled. Please use Gmail login.',
          useFirebaseAuth: true
        });
      }

      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      const result = await authService.sendOTP(phone);
      res.json(result);
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Verify OTP and login/register (DOCTORS/STAFF ONLY)
  async verifyOTP(req, res) {
    try {
      const { phone, otp, role } = req.body;

      // Block patient OTP verification
      if (role === 'PATIENT') {
        return res.status(403).json({ 
          error: 'Patient login via OTP is disabled. Please use Gmail login.',
          useFirebaseAuth: true
        });
      }

      if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP are required' });
      }

      const result = await authService.verifyOTP(phone, otp, role || 'DOCTOR');
      res.json(result);
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  // Create patient profile (DEPRECATED - Use Firestore directly)
  async createPatientProfile(req, res) {
    try {
      return res.status(410).json({ 
        error: 'This endpoint is deprecated. Patient profiles are managed in Firebase Firestore.',
        message: 'Please update your patient profile in the mobile app. It will automatically sync to Firestore.'
      });
    } catch (error) {
      console.error('Create patient profile error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create doctor profile
  async createDoctorProfile(req, res) {
    try {
      const userId = req.user.userId;
      const profileData = req.body;

      const doctor = await authService.createDoctorProfile(userId, profileData);
      res.json({ success: true, doctor });
    } catch (error) {
      console.error('Create doctor profile error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update language preference
  async updateLanguage(req, res) {
    try {
      const userId = req.user.userId;
      const { language } = req.body;

      if (!language) {
        return res.status(400).json({ error: 'Language is required' });
      }

      const user = await authService.updateLanguage(userId, language);
      res.json({ success: true, user });
    } catch (error) {
      console.error('Update language error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const userId = req.user.userId;
      
      // Get user with profile
      const { default: prisma } = await import('../config/prisma.js');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          patient: true,
          doctor: {
            include: {
              clinics: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Remove sensitive data
      delete user.notifications;

      res.json({ user });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Firebase authentication: Login/Register with Firebase ID token
  async authenticateWithFirebase(req, res) {
    try {
      const { firebaseToken, role } = req.body;

      if (!firebaseToken) {
        return res.status(400).json({ error: 'Firebase token is required' });
      }

      const result = await authService.authenticateWithFirebase(
        firebaseToken, 
        role || 'PATIENT'
      );
      
      res.json(result);
    } catch (error) {
      console.error('Firebase authentication error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  // Sync Firebase user data
  async syncFirebaseUser(req, res) {
    try {
      const userId = req.user.userId;
      const { firebaseToken } = req.body;

      if (!firebaseToken) {
        return res.status(400).json({ error: 'Firebase token is required' });
      }

      const result = await authService.syncFirebaseUser(userId, firebaseToken);
      res.json(result);
    } catch (error) {
      console.error('Sync Firebase user error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AuthController();

