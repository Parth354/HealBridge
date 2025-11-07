import { verifyToken } from '../config/auth.js';
import { verifyFirebaseToken } from '../config/firebase.js';
import prisma from '../config/prisma.js';

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

    // Try to verify as Firebase token first (Firebase tokens are typically longer)
    // Firebase tokens start with "ey" and are JWT format but much longer
    if (token.length > 500) {
      try {
        const firebaseDecoded = await verifyFirebaseToken(token);
        
        // Find user by Firebase UID
        user = await prisma.user.findUnique({
          where: { firebase_uid: firebaseDecoded.uid },
          include: {
            patient: true,
            doctor: true
          }
        });

        if (!user) {
          return res.status(401).json({ 
            error: 'User not found',
            hint: 'Please complete registration with Firebase token'
          });
        }

        console.log(`✅ Authenticated via Firebase token: ${user.id}`);
      } catch (firebaseError) {
        // If Firebase verification fails, try JWT
        console.log('Firebase token verification failed, trying JWT...');
        decoded = verifyToken(token);
      }
    } else {
      // Short token, likely our JWT
      decoded = verifyToken(token);
    }

    // If we got JWT decoded, fetch user by ID
    if (decoded && !user) {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          patient: true,
          doctor: true
        }
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

