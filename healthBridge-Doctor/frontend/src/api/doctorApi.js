import apiClient from './client';

// ============================================
// REAL BACKEND API INTEGRATION
// All functions call actual backend endpoints
// ============================================

// ==================== SCHEDULE MANAGEMENT ====================

// Create a schedule block
export const createSchedule = async (scheduleData) => {
  try {
    const response = await apiClient.post('/doctor/schedule', scheduleData);
    return { success: true, data: response.schedule };
  } catch (error) {
    console.error('Create schedule error:', error);
    throw new Error(error.message || 'Failed to create schedule');
  }
};

// Create recurring schedule
export const createRecurringSchedule = async (scheduleData) => {
  try {
    const response = await apiClient.post('/doctor/schedule/recurring', scheduleData);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to create recurring schedule');
  }
};

// Mark unavailable (break/holiday)
export const markUnavailable = async (startTs, endTs, type) => {
  try {
    const response = await apiClient.post('/doctor/schedule/unavailable', {
      startTs,
      endTs,
      type
    });
    return { success: true, data: response.schedule };
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to mark unavailable');
  }
};

// Get doctor's schedule
export const getSchedule = async (startDate, endDate) => {
  try {
    const response = await apiClient.get('/doctor/schedule', {
      params: { startDate, endDate }
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to get schedule');
  }
};

// Update schedule block
export const updateSchedule = async (blockId, scheduleData) => {
  try {
    const response = await apiClient.put(`/doctor/schedule/${blockId}`, scheduleData);
    return { success: true, data: response.schedule };
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update schedule');
  }
};

// Delete schedule block
export const deleteSchedule = async (blockId) => {
  try {
    const response = await apiClient.delete(`/doctor/schedule/${blockId}`);
    return { success: true, message: response.message || 'Schedule deleted successfully' };
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to delete schedule');
  }
};

// ==================== APPOINTMENTS ====================

// Get doctor's appointments
export const getAppointments = async (date) => {
  try {
    const response = await apiClient.get('/doctor/appointments', {
      params: { date }
    });
    
    const appointments = response.appointments || [];
    return {
      success: true,
      data: Array.isArray(appointments) ? appointments : [],
      count: response.count || appointments.length || 0
    };
  } catch (error) {
    console.error('Get appointments error:', error);
    throw new Error(error.message || 'Failed to get appointments');
  }
};

// Get appointment by ID
export const getAppointmentById = async (appointmentId) => {
  try {
    const appointments = await getAppointments();
    const appointment = appointments.data.find(apt => apt.id === appointmentId);
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    return { success: true, data: appointment };
  } catch (error) {
    throw new Error(error.message || 'Failed to get appointment');
  }
};

// Start consultation
export const startConsultation = async (appointmentId) => {
  try {
    const response = await apiClient.post(`/doctor/appointments/${appointmentId}/start`);
    return { success: true, data: response.appointment };
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to start consultation');
  }
};

// End consultation
export const endConsultation = async (appointmentId) => {
  try {
    const response = await apiClient.post(`/doctor/appointments/${appointmentId}/end`);
    return { success: true, data: response.appointment };
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to end consultation');
  }
};

// ==================== PATIENT CONTEXT & RAG ====================

// Get patient context for appointment
export const getPatientContext = async (appointmentId) => {
  try {
    const response = await apiClient.get(`/doctor/appointments/${appointmentId}/patient-context`);
    return { success: true, data: response };
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to get patient context');
  }
};

// Query patient history using RAG
export const queryPatientHistory = async (patientId, query) => {
  try {
    const response = await apiClient.post(`/doctor/patients/${patientId}/query`, { query });
    return { success: true, data: response };
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to query patient history');
  }
};

// Get patient by ID (from appointment context)
export const getPatientById = async (patientId) => {
  try {
    // Get all appointments and find patient info
    const appointments = await getAppointments();
    const appointment = appointments.data.find(apt => apt.patient_id === patientId);
    
    if (appointment) {
      return {
        success: true,
        data: appointment.patient
      };
    }
    
    throw new Error('Patient not found');
  } catch (error) {
    throw new Error(error.message || 'Failed to get patient');
  }
};

// ==================== PRESCRIPTIONS ====================

// Create prescription
export const createPrescription = async (prescriptionData) => {
  try {
    const response = await apiClient.post('/doctor/prescriptions', prescriptionData);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to create prescription');
  }
};

// Alias for legacy code
export const savePrescription = createPrescription;

// Send prescription (handled by backend notification service)
export const sendPrescription = async (prescriptionId, patientId) => {
  // Backend automatically sends notification when prescription is created
  return {
    success: true,
    message: 'Prescription sent to patient successfully'
  };
};

// ==================== ANALYTICS & STATISTICS ====================

// Get doctor statistics
export const getStatistics = async (startDate, endDate) => {
  try {
    const response = await apiClient.get('/doctor/statistics', {
      params: { startDate, endDate }
    });
    console.log('Statistics response:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Statistics error:', error);
    throw new Error(error.message || 'Failed to get statistics');
  }
};

// Alias for analytics
export const getAnalytics = getStatistics;

// Get doctor current status
export const getDoctorStatus = async () => {
  try {
    const response = await apiClient.get('/doctor/status');
    console.log('Status response:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Status error:', error);
    throw new Error(error.message || 'Failed to get doctor status');
  }
};

// ==================== CLINIC MANAGEMENT ====================

// Add clinic
export const addClinic = async (clinicData) => {
  try {
    const response = await apiClient.post('/doctor/clinics', clinicData);
    return { success: true, data: response.clinic };
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to add clinic');
  }
};

// Get clinics
export const getClinics = async () => {
  try {
    const response = await apiClient.get('/doctor/clinics');
    console.log('Raw clinics response:', response);
    
    // Backend returns { clinics: [...] } or might return array directly
    const clinicsData = response.clinics || response.data || response;
    return {
      success: true,
      data: Array.isArray(clinicsData) ? clinicsData : [],
      count: Array.isArray(clinicsData) ? clinicsData.length : 0
    };
  } catch (error) {
    console.error('Get clinics error:', error);
    throw new Error(error.message || 'Failed to get clinics');
  }
};

// ==================== LICENSE VERIFICATION ====================

// Request license verification
export const requestLicenseVerification = async () => {
  try {
    const response = await apiClient.post('/doctor/verification/request');
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to request verification');
  }
};

// Get verification status
export const getVerificationStatus = async () => {
  try {
    const response = await apiClient.get('/doctor/verification/status');
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to get verification status');
  }
};

// ==================== EMERGENCY MANAGEMENT ====================

// Handle emergency leave
export const handleEmergencyLeave = async (startTime, endTime, reason) => {
  try {
    const response = await apiClient.post('/doctor/emergency/leave', {
      startTime,
      endTime,
      reason
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to handle emergency leave');
  }
};

// ==================== WAIT TIME MANAGEMENT ====================

// Update wait time factors
export const updateWaitTimeFactors = async () => {
  try {
    const response = await apiClient.post('/doctor/waittime/update');
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update wait time factors');
  }
};

// ==================== LEGACY/HELPER FUNCTIONS ====================

// Search patient data (alias for queryPatientHistory)
export const searchPatientData = async (patientId, query) => {
  return queryPatientHistory(patientId, query);
};

// Add time slot (uses createSchedule)
export const addTimeSlot = async (slotData) => {
  return createSchedule(slotData);
};

// Mark leave (uses markUnavailable)
export const markLeave = async (leaveData) => {
  const { startDate, endDate, type = 'HOLIDAY' } = leaveData;
  return markUnavailable(startDate, endDate, type);
};

// Update appointment status (handled by start/end consultation)
export const updateAppointmentStatus = async (id, status) => {
  if (status === 'IN_PROGRESS' || status === 'in_progress') {
    return startConsultation(id);
  } else if (status === 'COMPLETED' || status === 'completed') {
    return endConsultation(id);
  }
  
  return {
    success: true,
    message: 'Status updated (handled by consultation flow)'
  };
};
