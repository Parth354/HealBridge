import Joi from 'joi';

// Validate request body against schema
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req.body = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // Auth schemas
  sendOTP: Joi.object({
    phone: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be 10 digits'
      }),
    role: Joi.string().valid('DOCTOR', 'STAFF').optional()
  }),

  verifyOTP: Joi.object({
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    otp: Joi.string().length(6).required(),
    role: Joi.string().valid('DOCTOR', 'STAFF').default('DOCTOR') // PATIENT removed
      .messages({
        'any.only': 'OTP authentication is only available for doctors and staff. Patients must use Firebase/Gmail login.'
      })
  }),

  createPatientProfile: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    dob: Joi.date().max('now').required(),
    gender: Joi.string().valid('Male', 'Female', 'Other').required(),
    allergies: Joi.string().max(500).allow('').optional(),
    chronicConditions: Joi.string().max(500).allow('').optional(),
    emergencyContact: Joi.string().pattern(/^[0-9]{10}$/).required()
  }),

  createDoctorProfile: Joi.object({
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().optional(),
    specialties: Joi.array().items(Joi.string()).min(1).required(),
    licenseNo: Joi.string().min(6).max(20).required()
  }),

  // Booking schemas
  createSlotHold: Joi.object({
    doctorId: Joi.string().required(),
    clinicId: Joi.string().required(),
    startTs: Joi.date().required(),
    endTs: Joi.date().greater(Joi.ref('startTs')).required()
  }),

  confirmAppointment: Joi.object({
    holdId: Joi.string().required(),
    visitType: Joi.string().valid('CLINIC', 'TELE', 'HOUSE').default('CLINIC'),
    address: Joi.string().when('visitType', {
      is: 'HOUSE',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    feeMock: Joi.number().min(0).default(500)
  }),

  // Schedule schemas
  createSchedule: Joi.object({
    clinicId: Joi.string().required(),
    startTs: Joi.date().required(),
    endTs: Joi.date().greater(Joi.ref('startTs')).required(),
    slotMinutes: Joi.number().min(5).max(120).default(15),
    bufferMinutes: Joi.number().min(0).max(30).default(0),
    type: Joi.string().valid('work', 'break', 'holiday').default('work')
  }),

  createRecurringSchedule: Joi.object({
    clinicId: Joi.string().required(),
    weekPattern: Joi.array().items(
      Joi.object({
        day: Joi.number().min(0).max(6).required(),
        startTime: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required(),
        endTime: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required()
      })
    ).min(1).required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    slotMinutes: Joi.number().min(5).max(120).default(15),
    bufferMinutes: Joi.number().min(0).max(30).default(0)
  }),

  // Prescription schema
  createPrescription: Joi.object({
    appointmentId: Joi.string().required(),
    medications: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        strength: Joi.string().required(),
        form: Joi.string().required(),
        freq: Joi.string().required(),
        route: Joi.string().default('oral'),
        durationDays: Joi.number().min(1).optional()
      })
    ).min(1).required(),
    diagnosis: Joi.string().max(1000).optional(),
    notes: Joi.string().max(2000).optional(),
    followUpDays: Joi.number().min(1).optional(),
    labTests: Joi.array().items(Joi.string()).optional()
  }),

  // Clinic schema
  addClinic: Joi.object({
    name: Joi.string().min(3).max(200).required(),
    lat: Joi.number().min(-90).max(90).required(),
    lon: Joi.number().min(-180).max(180).required(),
    address: Joi.string().min(10).max(500).required(),
    houseVisitRadiusKm: Joi.number().min(0).max(50).default(5)
  }),

  // Emergency leave schema
  emergencyLeave: Joi.object({
    startTime: Joi.date().required(),
    endTime: Joi.date().greater(Joi.ref('startTime')).required(),
    reason: Joi.string().max(500).optional()
  })
};

export {
  validate,
  schemas
};

