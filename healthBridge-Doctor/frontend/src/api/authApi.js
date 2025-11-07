import apiClient from './client';

// Send OTP to phone number
export const sendOTP = async (phone) => {
  try {
    const response = await apiClient.post('/auth/otp/send', { phone });
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to send OTP');
  }
};

// Send OTP to email
export const sendEmailOTP = async (email) => {
  try {
    // For email, we'll use phone endpoint but with email format
    // Backend needs to support email OTP as well
    const response = await apiClient.post('/auth/otp/send', { phone: email });
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to send OTP');
  }
};

// Verify OTP
export const verifyOTP = async (identifier, otp, role = 'DOCTOR') => {
  try {
    const response = await apiClient.post('/auth/otp/verify', {
      phone: identifier,
      otp,
      role,
    });
    return {
      success: true,
      token: response.token,
      user: response.user,
    };
  } catch (error) {
    throw new Error(error.error || error.message || 'Invalid OTP');
  }
};

// Get current user
export const getCurrentUser = async (token) => {
  try {
    const response = await apiClient.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return {
      success: true,
      user: response.user,
    };
  } catch (error) {
    throw new Error(error.error || error.message || 'Failed to get user');
  }
};

// Create doctor profile
export const createDoctorProfile = async (token, profileData) => {
  try {
    const response = await apiClient.post('/auth/doctor/profile', profileData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return {
      success: true,
      doctor: response.doctor,
    };
  } catch (error) {
    throw new Error(error.error || error.message || 'Failed to create doctor profile');
  }
};

