// App constants
export const APP_NAME = 'HealBridge Doctor';
export const APP_VERSION = '1.0.0';

// API Base URL (mock)
export const API_BASE_URL = 'https://healbridgebackend.onrender.com/api';

// Routes
export const ROUTES = {
  LOGIN: '/login',
  VERIFY: '/verify',
  DASHBOARD: '/dashboard',
  SCHEDULE: '/schedule',
  PATIENT_SUMMARY: '/patient/:id',
  CONSULT: '/consult/:appointmentId',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
};

// Appointment Status (Backend Enum)
export const APPOINTMENT_STATUS = {
  HOLD: 'HOLD',
  CONFIRMED: 'CONFIRMED',
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  RESCHEDULED: 'RESCHEDULED',
};

// Status Colors
export const STATUS_COLORS = {
  [APPOINTMENT_STATUS.HOLD]: 'bg-blue-100 text-blue-800 border-blue-200',
  [APPOINTMENT_STATUS.CONFIRMED]: 'bg-green-100 text-green-800 border-green-200',
  [APPOINTMENT_STATUS.STARTED]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [APPOINTMENT_STATUS.COMPLETED]: 'bg-gray-100 text-gray-800 border-gray-200',
  [APPOINTMENT_STATUS.CANCELLED]: 'bg-red-100 text-red-800 border-red-200',
  [APPOINTMENT_STATUS.RESCHEDULED]: 'bg-orange-100 text-orange-800 border-orange-200',
};

// Toast Types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Medicine Categories
export const MEDICINE_CATEGORIES = [
  'Antibiotic',
  'Analgesic',
  'Antacid',
  'Antihistamine',
  'Antihypertensive',
  'Antidiabetic',
  'Vitamin',
  'Supplement',
];

// Common Medicines (for autocomplete)
export const COMMON_MEDICINES = [
  { name: 'Amoxicillin', category: 'Antibiotic', strength: ['250mg', '500mg'] },
  { name: 'Paracetamol', category: 'Analgesic', strength: ['500mg', '650mg', '1000mg'] },
  { name: 'Ibuprofen', category: 'Analgesic', strength: ['200mg', '400mg', '600mg'] },
  { name: 'Omeprazole', category: 'Antacid', strength: ['20mg', '40mg'] },
  { name: 'Cetirizine', category: 'Antihistamine', strength: ['5mg', '10mg'] },
  { name: 'Amlodipine', category: 'Antihypertensive', strength: ['5mg', '10mg'] },
  { name: 'Metformin', category: 'Antidiabetic', strength: ['500mg', '850mg', '1000mg'] },
  { name: 'Vitamin D3', category: 'Vitamin', strength: ['1000IU', '2000IU', '5000IU'] },
];

// Dosage Frequencies
export const DOSAGE_FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'As needed',
  'Before meals',
  'After meals',
  'At bedtime',
];

// Duration Units
export const DURATION_UNITS = ['Days', 'Weeks', 'Months'];

// Vitals normal ranges
export const VITAL_RANGES = {
  BP_SYSTOLIC: { min: 90, max: 120, unit: 'mmHg' },
  BP_DIASTOLIC: { min: 60, max: 80, unit: 'mmHg' },
  HEART_RATE: { min: 60, max: 100, unit: 'bpm' },
  TEMPERATURE: { min: 97, max: 99, unit: '°F' },
  OXYGEN_SATURATION: { min: 95, max: 100, unit: '%' },
  RESPIRATORY_RATE: { min: 12, max: 20, unit: '/min' },
};

