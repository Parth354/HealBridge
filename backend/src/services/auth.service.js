import prisma from '../config/prisma.js';
import redisClient from '../config/redis.js';
import { generateToken } from '../config/auth.js';
import config from '../config/env.js';
import crypto from 'crypto';
import twilio from 'twilio';
import { verifyFirebaseToken, getFirebaseUser } from '../config/firebase.js';
import firestoreService from './firestore.service.js';

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

  // Verify OTP and create/login user (DOCTORS ONLY)
  async verifyOTP(phone, otp, role = 'DOCTOR') {
    // Block patient OTP login
    if (role === 'PATIENT') {
      throw new Error('Patient login via OTP is disabled. Please use Gmail login.');
    }

    const key = `otp:${phone}`;
    const storedOTP = await redisClient.get(key);
    
    if (!storedOTP || storedOTP !== otp) {
      throw new Error('Invalid or expired OTP');
    }

    // Delete OTP after verification
    await redisClient.del(key);

    // Find or create user (doctors and staff only)
    let user = await prisma.user.findUnique({
      where: { phone },
      include: {
        patient: true,
        doctor: true
      }
    });

    if (!user) {
      // Only allow creating doctor/staff accounts
      if (role !== 'DOCTOR' && role !== 'STAFF') {
        throw new Error('Invalid role for OTP authentication');
      }

      user = await prisma.user.create({
        data: {
          phone,
          role,
          verified: true
        }
      });
    } else {
      // Verify user role is not PATIENT
      if (user.role === 'PATIENT') {
        throw new Error('Patient accounts must use Firebase authentication');
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
      }
    });

    return patient;
  }

  // Create doctor profile
  async createDoctorProfile(userId, profileData) {
    const { specialties, licenseNo } = profileData;

    const doctor = await prisma.doctor.create({
      data: {
        user_id: userId,
        specialties,
        licenseNo,
        verifiedStatus: 'PENDING'
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

  // Firebase authentication: Login/Register with Firebase ID token (PATIENTS ONLY)
  async authenticateWithFirebase(firebaseIdToken, role = 'PATIENT') {
    try {
      // Only patients should use Firebase authentication
      if (role !== 'PATIENT') {
        throw new Error('Firebase authentication is only for patients. Doctors should use OTP login.');
      }

      // Verify Firebase ID token
      const decodedToken = await verifyFirebaseToken(firebaseIdToken);
      const { uid, email, email_verified, name, picture } = decodedToken;

      if (!email) {
        throw new Error('Email is required for Firebase authentication');
      }

      // Check if patient profile exists in Firestore
      const firestoreProfile = await firestoreService.getPatientProfile(uid);
      const hasProfile = firestoreProfile && firestoreProfile.firstName;

      // Check if user exists in our system
      let user = await prisma.user.findUnique({
        where: { firebase_uid: uid },
        include: {
          patient: false, // Don't load patient from PostgreSQL
          doctor: true
        }
      });

      // If no user with Firebase UID, check if user exists with email
      if (!user) {
        user = await prisma.user.findUnique({
          where: { email },
          include: {
            patient: false,
            doctor: true
          }
        });

        // If user exists with email but no firebase_uid, link accounts
        if (user) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { 
              firebase_uid: uid,
              email,
              role: 'PATIENT', // Ensure role is PATIENT
              verified: email_verified || true
            },
            include: {
              patient: false,
              doctor: true
            }
          });
          console.log(`✅ Linked existing user ${user.id} with Firebase UID ${uid}`);
        }
      }

      // Create new user if doesn't exist
      if (!user) {
        user = await prisma.user.create({
          data: {
            firebase_uid: uid,
            email,
            role: 'PATIENT',
            verified: email_verified || true
          }
        });
        console.log(`✅ Created new patient user ${user.id} with Firebase UID ${uid}`);
      }

      // Generate JWT token for our system
      const token = generateToken(user.id, user.role);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firebase_uid: user.firebase_uid,
          role: user.role,
          verified: user.verified,
          hasProfile: hasProfile, // Check Firestore instead of PostgreSQL
          name: name || firestoreProfile?.name || null,
          picture: picture || null,
          profileData: firestoreProfile || null
        }
      };
    } catch (error) {
      console.error('Firebase authentication error:', error);
      throw new Error(`Firebase authentication failed: ${error.message}`);
    }
  }

  // Sync Firebase user data with our database
  async syncFirebaseUser(userId, firebaseIdToken) {
    try {
      const decodedToken = await verifyFirebaseToken(firebaseIdToken);
      const { uid, email, name, picture } = decodedToken;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          firebase_uid: uid,
          email: email || undefined
        },
        include: {
          patient: true,
          doctor: true
        }
      });

      return {
        success: true,
        user,
        firebaseData: { name, picture }
      };
    } catch (error) {
      console.error('Sync Firebase user error:', error);
      throw new Error(`Failed to sync Firebase user: ${error.message}`);
    }
  }

  // Get or create user from Firebase UID (for linking accounts)
  async getUserByFirebaseUid(firebaseUid) {
    return await prisma.user.findUnique({
      where: { firebase_uid: firebaseUid },
      include: {
        patient: true,
        doctor: true
      }
    });
  }
}

export default new AuthService();

