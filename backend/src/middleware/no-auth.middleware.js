import prisma from '../config/prisma.js';

// No authentication middleware - allows public access
const noAuth = async (req, res, next) => {
  try {
    // Ensure public user exists
    let publicUser = await prisma.user.findUnique({
      where: { id: 'public-user' },
      include: { patient: true }
    });

    if (!publicUser) {
      // Create public user if it doesn't exist
      publicUser = await prisma.user.create({
        data: {
          id: 'public-user',
          email: 'public@healbridge.com',
          role: 'PATIENT',
          language: 'en',
          firebase_uid: 'public-firebase-uid',
          patient: {
            create: {
              id: 'public-patient'
            }
          }
        },
        include: { patient: true }
      });
      console.log('✅ Created public user for no-auth access');
    }

    // Set mock user for compatibility with existing code
    req.user = {
      userId: 'public-user',
      role: 'PATIENT',
      patientId: 'public-patient',
      doctorId: null,
      firebaseUid: 'public-firebase-uid'
    };
    next();
  } catch (error) {
    console.error('Public user creation error:', error);
    // Continue anyway with mock user
    req.user = {
      userId: 'public-user',
      role: 'PATIENT',
      patientId: 'public-patient',
      doctorId: null,
      firebaseUid: 'public-firebase-uid'
    };
    next();
  }
};

const noRole = () => {
  return (req, res, next) => {
    next();
  };
};

const noProfile = (req, res, next) => {
  next();
};

export {
  noAuth as authenticate,
  noRole as requireRole,
  noProfile as requirePatientProfile,
  noProfile as requireDoctorProfile,
  noProfile as requireVerifiedDoctor
};