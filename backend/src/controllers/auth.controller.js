import authService from '../services/auth.service.js';

class AuthController {
  // Send OTP to phone number (PATIENTS, DOCTORS, STAFF)
  async sendOTP(req, res) {
    try {
      let { phone, role = 'PATIENT' } = req.body;

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

  // Verify OTP and login/register (PATIENTS, DOCTORS, STAFF)
  async verifyOTP(req, res) {
    try {
      const { phone, otp, role = 'PATIENT' } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP are required' });
      }

      const result = await authService.verifyOTP(phone, otp, role);
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
      
      // Parse name for response
      const nameParts = patient.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      res.json({ 
        success: true, 
        profile: {
          firstName,
          lastName,
          email: patient.user?.email || '',
          phoneNumber: patient.user?.phone || '',
          dob: patient.dob.toISOString().split('T')[0],
          gender: patient.gender,
          allergies: patient.allergies ? patient.allergies.split(', ').filter(a => a.trim()) : [],
          conditions: patient.chronicConditions ? patient.chronicConditions.split(', ').filter(c => c.trim()) : [],
          emergencyContactPhone: patient.emergencyContact
        },
        hasProfile: true
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

}

export default new AuthController();

