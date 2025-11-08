import { verifyToken } from '../config/auth.js';
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

// Authenticate JWT token only
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const decoded = verifyToken(token);
    
    // Fetch user by ID with retry logic
    const user = await retryDatabaseQuery(async () => {
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

    // Attach user info to request
    req.user = {
      userId: user.id,
      id: user.id,
      role: user.role,
      patientId: user.patient?.id,
      doctorId: user.doctor?.id,
      phone: user.phone,
      email: user.email
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
        retryAfter: 5
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

    next();
  };
};

// Require patient profile
const requirePatientProfile = async (req, res, next) => {
  if (req.user.role === 'PATIENT') {
    if (!req.user.patientId) {
      return res.status(403).json({ 
        error: 'Patient profile required',
        message: 'Please complete your profile before accessing this resource'
      });
    }
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

