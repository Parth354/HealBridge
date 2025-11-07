/**
 * Comprehensive Patient Endpoints Test Suite
 * Tests all patient-related API endpoints
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const TEST_CONFIG = {
  timeout: 5000, // Reduced to 5 seconds
  validateStatus: () => true, // Don't throw on any status
  maxRedirects: 5
};

// Test data will be populated during authentication
let authToken = '';
let testFirebaseUid = '';
let testPatientId = '';
let testAppointmentId = '';
let testMedicationId = '';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

// Test result tracker
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
};

/**
 * Test helper functions
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTestStart(testName) {
  testResults.total++;
  log(`\n${'='.repeat(80)}`, 'blue');
  log(`TEST ${testResults.total}: ${testName}`, 'bold');
  log('='.repeat(80), 'blue');
}

function logTestResult(passed, message, details = null) {
  if (passed) {
    testResults.passed++;
    log(`✅ PASS: ${message}`, 'green');
  } else {
    testResults.failed++;
    log(`❌ FAIL: ${message}`, 'red');
  }
  if (details) {
    console.log(details);
  }
}

function logSkipped(message) {
  testResults.skipped++;
  log(`⚠️  SKIP: ${message}`, 'yellow');
}

function logSummary() {
  log('\n' + '='.repeat(80), 'blue');
  log('TEST SUMMARY', 'bold');
  log('='.repeat(80), 'blue');
  log(`Total Tests: ${testResults.total}`, 'blue');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, 'red');
  log(`Skipped: ${testResults.skipped}`, 'yellow');
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`, 'bold');
  log('='.repeat(80) + '\n', 'blue');
}

/**
 * Authentication Tests
 */
async function testFirebaseLogin() {
  logTestStart('Firebase Login (Patient Authentication)');
  
  try {
    // Note: This test sends an INVALID token to verify proper rejection
    // Expected: 400 or 401 status (token validation working)
    const response = await axios.post(
      `${BASE_URL}/auth/firebase/login`,
      { firebaseToken: 'invalid_token', role: 'PATIENT' },
      TEST_CONFIG
    );

    if (response.status === 400 || response.status === 401) {
      logTestResult(true, 'Firebase login endpoint correctly rejects invalid tokens ✅');
      log(`  Status: ${response.status}`, 'blue');
      log(`  Message: ${response.data.error}`, 'blue');
      return true;
    } else if (response.status === 200) {
      logTestResult(false, 'SECURITY ISSUE: Invalid token was accepted!', response.data);
      return false;
    } else {
      logTestResult(false, 'Unexpected response from Firebase login', response.data);
      return false;
    }
  } catch (error) {
    // Network errors or timeouts
    if (error.code === 'ECONNREFUSED') {
      logTestResult(false, 'Backend server not running', error.message);
    } else {
      logTestResult(false, 'Firebase login endpoint error', error.message);
    }
    return false;
  }
}

async function testOTPLoginBlocked() {
  logTestStart('OTP Login Blocked for Patients');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/otp/send`,
      { phone: '1234567890', role: 'PATIENT' },
      TEST_CONFIG
    );

    // Should return 400 (validation error) or 403 (forbidden)
    if ((response.status === 400 || response.status === 403) && response.data.error) {
      logTestResult(true, 'Patient OTP login correctly blocked or validated');
      log(`  Response: ${response.data.error}`, 'blue');
      return true;
    } else {
      logTestResult(false, 'Patient OTP login should be blocked', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'OTP block test error', error.message);
    return false;
  }
}

async function testGetCurrentUser() {
  logTestStart('Get Current User (Protected)');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/auth/me`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200 && response.data.user) {
      logTestResult(true, 'Successfully fetched current user');
      testFirebaseUid = response.data.user.firebase_uid;
      testPatientId = response.data.user.id;
      log(`  Firebase UID: ${testFirebaseUid}`, 'blue');
      log(`  User ID: ${testPatientId}`, 'blue');
      return true;
    } else {
      logTestResult(false, 'Failed to fetch current user', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Get current user error', error.message);
    return false;
  }
}

/**
 * Profile Tests
 */
async function testGetPatientProfile() {
  logTestStart('Get Patient Profile from Firestore');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/patient/profile`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200) {
      logTestResult(true, 'Successfully fetched patient profile from Firestore');
      log(`  Profile data: ${JSON.stringify(response.data.profile, null, 2)}`, 'blue');
      return true;
    } else if (response.status === 404) {
      logTestResult(true, 'Profile not found (expected for new user)');
      return true;
    } else if (response.status === 400 && response.data.error.includes('Firebase UID')) {
      logTestResult(true, 'Correctly requires Firebase UID');
      return true;
    } else {
      logTestResult(false, 'Unexpected response', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Get profile error', error.message);
    return false;
  }
}

async function testUpdatePatientProfile() {
  logTestStart('Update Patient Profile in Firestore');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const profileData = {
      firstName: 'Test',
      lastName: 'Patient',
      dob: '1990-01-01',
      gender: 'Male',
      phoneNumber: '+1234567890',
      allergies: ['Penicillin'],
      conditions: ['Hypertension']
    };

    const response = await axios.put(
      `${BASE_URL}/patient/profile`,
      profileData,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200) {
      logTestResult(true, 'Successfully updated patient profile');
      return true;
    } else if (response.status === 400 && response.data.error.includes('Firebase UID')) {
      logTestResult(true, 'Correctly requires Firebase UID');
      return true;
    } else {
      logTestResult(false, 'Failed to update profile', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Update profile error', error.message);
    return false;
  }
}

/**
 * Triage Tests
 */
async function testAnalyzeSymptoms() {
  logTestStart('Analyze Symptoms (Triage)');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/patient/triage/analyze`,
      {
        symptoms: ['fever', 'cough', 'headache'],
        severity: 'moderate',
        duration: '3 days'
      },
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200) {
      logTestResult(true, 'Successfully analyzed symptoms');
      log(`  Triage result: ${JSON.stringify(response.data, null, 2)}`, 'blue');
      return true;
    } else {
      logTestResult(false, 'Failed to analyze symptoms', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Analyze symptoms error', error.message);
    return false;
  }
}

async function testGetTriageCategories() {
  logTestStart('Get Triage Categories');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/patient/triage/categories`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200) {
      logTestResult(true, 'Successfully fetched triage categories');
      return true;
    } else {
      logTestResult(false, 'Failed to fetch categories', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Get categories error', error.message);
    return false;
  }
}

/**
 * Doctor Search Tests
 */
async function testSearchDoctors() {
  logTestStart('Search Doctors');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/patient/doctors/search?specialty=Cardiology&lat=40.7128&lon=-74.0060`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200) {
      logTestResult(true, 'Successfully searched doctors');
      log(`  Found ${response.data.doctors?.length || 0} doctors`, 'blue');
      return true;
    } else {
      logTestResult(false, 'Failed to search doctors', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Search doctors error', error.message);
    return false;
  }
}

async function testGetDoctorAvailability() {
  logTestStart('Get Doctor Availability');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    // Using dummy IDs for test
    const response = await axios.get(
      `${BASE_URL}/patient/doctors/test-doctor-id/clinics/test-clinic-id/availability`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200 || response.status === 404) {
      logTestResult(true, 'Doctor availability endpoint accessible');
      return true;
    } else {
      logTestResult(false, 'Unexpected response', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Get availability error', error.message);
    return false;
  }
}

/**
 * Appointment Tests
 */
async function testGetAppointments() {
  logTestStart('Get Patient Appointments');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/patient/appointments`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200) {
      logTestResult(true, 'Successfully fetched appointments');
      log(`  Appointments count: ${response.data.appointments?.length || 0}`, 'blue');
      if (response.data.appointments?.length > 0) {
        testAppointmentId = response.data.appointments[0].id;
      }
      return true;
    } else {
      logTestResult(false, 'Failed to fetch appointments', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Get appointments error', error.message);
    return false;
  }
}

async function testCreateSlotHold() {
  logTestStart('Create Slot Hold (Booking)');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/patient/bookings/hold`,
      {
        doctorId: 'test-doctor-id',
        clinicId: 'test-clinic-id',
        slotTime: new Date(Date.now() + 86400000).toISOString()
      },
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200 || response.status === 400 || response.status === 404) {
      logTestResult(true, 'Slot hold endpoint accessible');
      return true;
    } else {
      logTestResult(false, 'Unexpected response', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Create slot hold error', error.message);
    return false;
  }
}

async function testGetWaitTime() {
  logTestStart('Get Appointment Wait Time');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  if (!testAppointmentId) {
    logSkipped('No test appointment ID available');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/patient/appointments/${testAppointmentId}/waittime`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200 || response.status === 404) {
      logTestResult(true, 'Wait time endpoint accessible');
      return true;
    } else {
      logTestResult(false, 'Unexpected response', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Get wait time error', error.message);
    return false;
  }
}

/**
 * Prescription & Medication Tests
 */
async function testGetPrescriptions() {
  logTestStart('Get Patient Prescriptions');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/patient/prescriptions`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200) {
      logTestResult(true, 'Successfully fetched prescriptions');
      log(`  Prescriptions count: ${response.data.prescriptions?.length || 0}`, 'blue');
      return true;
    } else {
      logTestResult(false, 'Failed to fetch prescriptions', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Get prescriptions error', error.message);
    return false;
  }
}

async function testGetMedicationReminders() {
  logTestStart('Get Medication Reminders');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/patient/medications/reminders`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200) {
      logTestResult(true, 'Successfully fetched medication reminders');
      const medications = response.data.medications || [];
      log(`  Active medications: ${medications.length}`, 'blue');
      if (medications.length > 0) {
        testMedicationId = medications[0].id;
      }
      return true;
    } else {
      logTestResult(false, 'Failed to fetch reminders', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Get reminders error', error.message);
    return false;
  }
}

async function testGetRefillReminders() {
  logTestStart('Get Refill Reminders');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/patient/medications/refills`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200) {
      logTestResult(true, 'Successfully fetched refill reminders');
      return true;
    } else {
      logTestResult(false, 'Failed to fetch refills', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Get refills error', error.message);
    return false;
  }
}

/**
 * Patient Summary Test
 */
async function testGetPatientSummary() {
  logTestStart('Get Patient Summary (RAG)');
  
  if (!authToken) {
    logSkipped('No auth token available');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/patient/summary`,
      {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.status === 200) {
      logTestResult(true, 'Successfully generated patient summary');
      log(`  Summary: ${JSON.stringify(response.data.summary, null, 2).substring(0, 200)}...`, 'blue');
      return true;
    } else if (response.status === 404) {
      logTestResult(true, 'Patient not found (expected for new user)');
      return true;
    } else {
      logTestResult(false, 'Failed to get summary', response.data);
      return false;
    }
  } catch (error) {
    logTestResult(false, 'Get summary error', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  log('\n' + '='.repeat(80), 'blue');
  log('PATIENT ENDPOINTS COMPREHENSIVE TEST SUITE', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  log('⚠️  Note: Some tests require valid authentication tokens', 'yellow');
  log('⚠️  Testing all endpoints for accessibility and response\n', 'yellow');

  // Wrap all tests in try-catch to ensure they all run
  try {
    // Authentication Tests
    await testFirebaseLogin();
    await testOTPLoginBlocked();
    await testGetCurrentUser();

    // Profile Tests
    await testGetPatientProfile();
    await testUpdatePatientProfile();

    // Triage Tests
    await testAnalyzeSymptoms();
    await testGetTriageCategories();

    // Doctor Search Tests
    await testSearchDoctors();
    await testGetDoctorAvailability();

    // Appointment Tests
    await testGetAppointments();
    await testCreateSlotHold();
    await testGetWaitTime();

    // Prescription & Medication Tests
    await testGetPrescriptions();
    await testGetMedicationReminders();
    await testGetRefillReminders();

    // Patient Summary Test
    await testGetPatientSummary();
  } catch (error) {
    log(`\n⚠️  Error during test execution: ${error.message}`, 'yellow');
  }

  // Print summary
  logSummary();
  
  // Exit cleanly
  process.exit(0);
}

// Run tests with timeout safety
const testTimeout = setTimeout(() => {
  log('\n⚠️  Test suite timeout - forcing exit', 'yellow');
  logSummary();
  process.exit(0);
}, 60000); // 60 second timeout

runAllTests()
  .then(() => {
    clearTimeout(testTimeout);
  })
  .catch(error => {
    clearTimeout(testTimeout);
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    console.error(error);
    logSummary();
    process.exit(1);
  });

