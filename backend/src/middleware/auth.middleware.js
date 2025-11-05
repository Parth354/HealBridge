import { verifyToken } from '../config/auth.js';
import prisma from '../config/prisma.js';

// Authenticate JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    
    // Get user with profile
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        patient: true,
        doctor: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      role: user.role,
      patientId: user.patient?.id,
      doctorId: user.doctor?.id
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

    next();
  };
};

// Require patient profile
const requirePatientProfile = async (req, res, next) => {
  if (!req.user.patientId) {
    return res.status(403).json({ error: 'Patient profile required' });
  }
  next();
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

