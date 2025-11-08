import prisma from '../config/prisma.js';
import redisClient from '../config/redis.js';
import { generateToken } from '../config/auth.js';
import config from '../config/env.js';
import crypto from 'crypto';
import twilio from 'twilio';

class AuthService {
  constructor() {
    // 🔧 ROOT FIX: Initialize Twilio client for production SMS
    // Twilio client is initialized only if credentials are provided
    this.twilioClient = null;
    
    if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_PHONE_NUMBER) {
      try {
        this.twilioClient = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
        console.log('✅ Twilio SMS client initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Twilio:', error.message);
        console.warn('⚠️  SMS will fallback to console logging');
      }
    } else {
      console.warn('⚠️  Twilio credentials not found in .env');
      console.warn('⚠️  Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
      console.warn('⚠️  SMS will fallback to console logging for development');
    }
  }

  // Generate and store OTP
  async sendOTP(phone) {
    const otp = crypto.randomInt(100000, 999999).toString();
    const key = `otp:${phone}`;
    
    // Store OTP in Redis with 5 min expiry
    await redisClient.setEx(key, 300, otp);
    
    // 🔧 ROOT FIX: Send OTP via Twilio SMS
    // If Twilio is not configured, fallback to console logging for development
    
    if (this.twilioClient) {
      try {
        // Send SMS via Twilio
        phone="+91"+phone;
        console.log(phone);
        const message = await this.twilioClient.messages.create({
          body: `Your HealBridge OTP is: ${otp}. Valid for 5 minutes.`,
          from: config.TWILIO_PHONE_NUMBER,
          to: phone
        });
        
        console.log(`✅ OTP sent to ${phone} via SMS (SID: ${message.sid})`);
        return { 
          success: true, 
          message: 'OTP sent successfully via SMS',
          sid: message.sid 
        };
        
      } catch (error) {
        console.error('❌ Twilio SMS failed:', error.message);
        
        // Fallback to console log if SMS fails
        console.log(`⚠️  FALLBACK - OTP for ${phone}: ${otp}`);
        
        return { 
          success: true, 
          message: 'OTP sent (fallback mode)', 
          warning: 'SMS delivery failed, check logs'
        };
      }
    } else {
      // Development mode: Console logging
      console.log(`📱 DEV MODE - OTP for ${phone}: ${otp}`);
      console.log(`   (Configure Twilio in .env for production SMS)`);
      
      return { 
        success: true, 
        message: 'OTP sent (development mode)',
        devMode: true
      };
    }
  }

  // Verify OTP and create/login user (PATIENTS, DOCTORS, STAFF)
  async verifyOTP(phone, otp, role = 'PATIENT') {
    const key = `otp:${phone}`;
    const storedOTP = await redisClient.get(key);
    
    if (!storedOTP || storedOTP !== otp) {
      throw new Error('Invalid or expired OTP');
    }

    // Delete OTP after verification
    await redisClient.del(key);

    // Find or create user (patients, doctors, and staff)
    let user = await prisma.user.findUnique({
      where: { phone },
      include: {
        patient: true,
        doctor: true
      }
    });

    if (!user) {
      // Allow creating PATIENT, DOCTOR, or STAFF accounts
      if (!['PATIENT', 'DOCTOR', 'STAFF'].includes(role)) {
        throw new Error('Invalid role for OTP authentication');
      }

      user = await prisma.user.create({
        data: {
          phone,
          role: role || 'PATIENT',
          verified: true
        },
        include: {
          patient: true,
          doctor: true
        }
      });
    } else {
      // If user exists but role doesn't match, update role
      if (user.role !== role) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: role || user.role },
          include: {
            patient: true,
            doctor: true
          }
        });
      }
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        verified: user.verified,
        hasProfile: !!(user.patient || user.doctor)
      }
    };
  }

  // Create patient profile
  async createPatientProfile(userId, profileData) {
    const { name, dob, gender, allergies, chronicConditions, emergencyContact } = profileData;

    const patient = await prisma.patient.create({
      data: {
        user_id: userId,
        name,
        dob: new Date(dob),
        gender,
        allergies: allergies || '',
        chronicConditions: chronicConditions || '',
        emergencyContact
      },
      include: {
        user: true
      }
    });

    return patient;
  }

  // Create doctor profile
  async createDoctorProfile(userId, profileData) {
    const { firstName, lastName, email, specialties, licenseNo } = profileData;

    // Check if doctor profile already exists
    const existingDoctor = await prisma.doctor.findUnique({
      where: { user_id: userId }
    });

    if (existingDoctor) {
      throw new Error('Doctor profile already exists for this user');
    }

    // Update user email if provided
    if (email) {
      await prisma.user.update({
        where: { id: userId },
        data: { email }
      });
    }

    const doctor = await prisma.doctor.create({
      data: {
        user_id: userId,
        firstName: firstName || '',
        lastName: lastName || '',
        specialties,
        licenseNo,
        verifiedStatus: 'PENDING'
      },
      include: {
        user: true
      }
    });

    // Trigger license verification job
    // TODO: Add to queue for background processing
    
    return doctor;
  }

  // Update user language preference
  async updateLanguage(userId, language) {
    return await prisma.user.update({
      where: { id: userId },
      data: { language }
    });
  }

}

export default new AuthService();

