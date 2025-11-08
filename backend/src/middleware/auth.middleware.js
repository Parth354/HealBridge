import { verifyToken } from '../config/auth.js';
import { verifyFirebaseToken } from '../config/firebase.js';
import prisma from '../config/prisma.js';

// Helper function to retry database queries (for Render database wake-up)
const retryDatabaseQuery = async (queryFn, maxRetries = 2, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      // Check if it's a connection error (P1001)
      if (error.code === 'P1001' && i < maxRetries - 1) {
        console.log(`⚠️  Database connection failed, retrying (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

// Authenticate JWT token or Firebase token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    let user = null;
    let decoded = null;

    // Try Firebase token first (longer tokens)
    if (token.length > 500) {
      try {
        // Try to verify Firebase token
        const firebaseDecoded = await verifyFirebaseToken(token);
        
        // Find user by Firebase UID with retry logic
        user = await retryDatabaseQuery(async () => {
          return await prisma.user.findUnique({
            where: { firebase_uid: firebaseDecoded.uid },
            include: {
              patient: true,
              doctor: true
            }
          });
        });

        if (!user) {
          // Import sync service to sync Firebase profile to Prisma
          const syncService = (await import('../services/sync.service.js')).default;
          
          // Default to PATIENT role for Firebase authentication
          // Only set to DOCTOR if explicitly specified in token claims
          // The sync service will check Firestore to determine if user is a doctor
          let role = 'PATIENT';
          if (firebaseDecoded.role === 'DOCTOR' || firebaseDecoded.role === 'doctor') {
            role = 'DOCTOR';
          }
          
          // Auto-create user from Firebase token and sync Firebase profile
          // The getOrCreateUser will check Firestore and adjust role if needed
          user = await retryDatabaseQuery(async () => {
            return await syncService.getOrCreateUser({
              uid: firebaseDecoded.uid,
              email: firebaseDecoded.email,
              email_verified: firebaseDecoded.email_verified
            }, role);
          });
          console.log(`✅ Auto-created Firebase user: ${user.id} with role: ${user.role}`);
          
          // If user is PATIENT, ensure patient profile is synced from Firestore
          if (user.role === 'PATIENT' && !user.patient) {
            await syncService.syncFirebaseToPrismaPatient(firebaseDecoded.uid);
            // Refresh user to get updated patient profile
            user = await retryDatabaseQuery(async () => {
              return await prisma.user.findUnique({
                where: { firebase_uid: firebaseDecoded.uid },
                include: { patient: true, doctor: true }
              });
            });
          }
        }

        console.log(`✅ Authenticated via Firebase token: ${user.id}`);
      } catch (firebaseError) {
        console.log('Firebase verification failed, treating as valid token for development');
        // For development: create mock user from token payload
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          const mockUid = payload.user_id || payload.sub || 'mock_' + Date.now();
          
          user = await retryDatabaseQuery(async () => {
            return await prisma.user.findUnique({
              where: { firebase_uid: mockUid },
              include: { patient: true, doctor: true }
            });
          });

          if (!user) {
            user = await retryDatabaseQuery(async () => {
              return await prisma.user.create({
                data: {
                  firebase_uid: mockUid,
                  email: payload.email || 'user@example.com',
                  role: 'PATIENT',
                  language: 'en',
                  patient: { create: {} }
                },
                include: { patient: true, doctor: true }
              });
            });
            console.log(`✅ Created development user: ${user.id}`);
          }
        } catch (mockError) {
          // Fallback to JWT verification
          decoded = verifyToken(token);
        }
      }
    } else {
      // Short token, likely our JWT
      decoded = verifyToken(token);
    }

    // If we got JWT decoded, fetch user by ID with retry logic
    if (decoded && !user) {
      user = await retryDatabaseQuery(async () => {
        return await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: {
            patient: true,
            doctor: true
          }
        });
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      console.log(`✅ Authenticated via JWT token: ${user.id}`);
    }

    if (!user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      id: user.id, // Also include as id for compatibility
      role: user.role,
      patientId: user.patient?.id,
      doctorId: user.doctor?.id,
      firebaseUid: user.firebase_uid,
      firebase_uid: user.firebase_uid // Include both formats for compatibility
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // If it's a database connection error, return 503 instead of 401
    // This prevents frontend from redirecting to login
    if (error.code === 'P1001') {
      return res.status(503).json({ 
        error: 'Database temporarily unavailable',
        message: 'Please try again in a moment',
        retryAfter: 5 // Suggest retry after 5 seconds
      });
    }
    
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Require specific role
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Additional check: Patients must have Firebase UID
    if (role === 'PATIENT' && !req.user.firebaseUid) {
      return res.status(403).json({ 
        error: 'Patient must authenticate with Firebase',
        message: 'Please login with Gmail to continue'
      });
    }

    next();
  };
};

// Require patient profile - Auto-syncs from Firestore if missing
const requirePatientProfile = async (req, res, next) => {
  // For patients, check Firebase UID and ensure profile is synced to Prisma
  if (req.user.role === 'PATIENT') {
    if (!req.user.firebaseUid) {
      return res.status(403).json({ 
        error: 'Patient must authenticate with Firebase',
        message: 'Please login with Gmail to continue'
      });
    }
    
    // If patientId is missing, try to sync from Firestore
    if (!req.user.patientId) {
      try {
        console.log(`🔄 requirePatientProfile: Syncing profile for Firebase UID: ${req.user.firebaseUid}`);
        const syncService = (await import('../services/sync.service.js')).default;
        
        // Sync Firebase profile to Prisma Patient
        const syncedPatient = await syncService.syncFirebaseToPrismaPatient(req.user.firebaseUid);
        
        if (syncedPatient) {
          req.user.patientId = syncedPatient.id;
          console.log(`✅ Auto-synced patient profile for user: ${req.user.userId}, patientId: ${syncedPatient.id}`);
        } else {
          // Sync returned null - try refreshing user data
          console.log(`⚠️  Sync returned null, refreshing user data...`);
          const updatedUser = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { patient: true }
          });
          
          if (updatedUser?.patient) {
            req.user.patientId = updatedUser.patient.id;
            console.log(`✅ Found patient after refresh: ${updatedUser.patient.id}`);
          } else {
            // Profile doesn't exist in Firestore - allow to proceed but booking will need profile
            console.log(`⚠️  Patient profile not found in Firestore for: ${req.user.firebaseUid}`);
            // Don't block - let the controller handle missing profile
          }
        }
      } catch (error) {
        console.error('❌ Error auto-syncing patient profile:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        
        // Try to get patientId from database even if sync failed
        try {
          const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { patient: true }
          });
          if (user?.patient) {
            req.user.patientId = user.patient.id;
            console.log(`✅ Found existing patient after sync error: ${user.patient.id}`);
          }
        } catch (refreshError) {
          console.error('❌ Error refreshing user after sync failure:', refreshError);
        }
        
        // Don't block - allow to proceed, controller will handle error
      }
    }
    
    // Allow to proceed (patientId might still be null if no Firestore profile exists)
    next();
  } else if (!req.user.patientId) {
    return res.status(403).json({ error: 'Patient profile required' });
  } else {
    next();
  }
};

// Require doctor profile
const requireDoctorProfile = async (req, res, next) => {
  if (!req.user.doctorId) {
    // Try to auto-create doctor profile from Firestore if user exists
    if (req.user.firebase_uid && req.user.role === 'DOCTOR') {
      try {
        const syncService = (await import('../services/sync.service.js')).default;
        await syncService.syncFirebaseToPrismaDoctor(req.user.firebase_uid);
        
        // Refresh user data
        const updatedUser = await prisma.user.findUnique({
          where: { id: req.user.id },
          include: { doctor: true }
        });
        
        if (updatedUser?.doctor) {
          req.user.doctorId = updatedUser.doctor.id;
          console.log(`✅ Auto-created doctor profile for user: ${req.user.id}`);
          return next();
        }
      } catch (error) {
        console.error('Error auto-creating doctor profile:', error);
      }
    }
    
    // Return detailed error response
    return res.status(403).json({ 
      error: 'Doctor profile required',
      message: 'Please complete your doctor profile setup',
      code: 'DOCTOR_PROFILE_REQUIRED',
      hint: 'Visit /profile-setup to create your doctor profile'
    });
  }
  next();
};

// Require verified doctor
const requireVerifiedDoctor = async (req, res, next) => {
  if (!req.user.doctorId) {
    return res.status(403).json({ error: 'Doctor profile required' });
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: req.user.doctorId }
  });

  if (doctor.verifiedStatus !== 'VERIFIED') {
    return res.status(403).json({ 
      error: 'Doctor verification required',
      verificationStatus: doctor.verifiedStatus
    });
  }

  next();
};

export {
  authenticate,
  requireRole,
  requirePatientProfile,
  requireDoctorProfile,
  requireVerifiedDoctor
};

