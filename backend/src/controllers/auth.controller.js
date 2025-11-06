import authService from '../services/auth.service.js';

class AuthController {
  // Send OTP to phone number
  async sendOTP(req, res) {
    try {
      let { phone } = req.body;
      

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

  // Verify OTP and login/register
  async verifyOTP(req, res) {
    try {
      const { phone, otp, role } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP are required' });
      }

      const result = await authService.verifyOTP(phone, otp, role || 'PATIENT');
      res.json(result);
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  // Create patient profile
  async createPatientProfile(req, res) {
    try {
      const userId = req.user.userId;
      const profileData = req.body;

      const patient = await authService.createPatientProfile(userId, profileData);
      res.json({ success: true, patient });
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
}

export default new AuthController();

