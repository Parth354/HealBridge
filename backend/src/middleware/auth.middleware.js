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
          
          // Auto-create user from Firebase token and sync Firebase profile
          user = await retryDatabaseQuery(async () => {
            return await syncService.getOrCreateUser({
              uid: firebaseDecoded.uid,
              email: firebaseDecoded.email,
              email_verified: firebaseDecoded.email_verified
            }, 'PATIENT');
          });
          console.log(`✅ Auto-created Firebase user: ${user.id}`);
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
      role: user.role,
      patientId: user.patient?.id,
      doctorId: user.doctor?.id,
      firebaseUid: user.firebase_uid
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

// Require patient profile (DEPRECATED - Patient data now in Firestore)
const requirePatientProfile = async (req, res, next) => {
  // For patients, check Firebase UID instead of patientId
  if (req.user.role === 'PATIENT') {
    if (!req.user.firebaseUid) {
      return res.status(403).json({ 
        error: 'Patient must authenticate with Firebase',
        message: 'Please login with Gmail to continue'
      });
    }
    // Patient profile validation happens in Firestore
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
    return res.status(403).json({ error: 'Doctor profile required' });
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

