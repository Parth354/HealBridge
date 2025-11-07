/**
 * API Service - Axios Instance Configuration
 * 
 * Features:
 * - Centralized API configuration
 * - Automatic token injection
 * - Error handling
 * - Request/response interceptors
 */

import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_LINK || 'https://healbridgebackend.onrender.com/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('doctor');
      window.location.href = '/login';
    }

    // Handle 503 Service Unavailable (database connection issues)
    if (error.response?.status === 503) {
      console.warn('Service temporarily unavailable, retrying...');
      // Could implement retry logic here
    }

    return Promise.reject(error);
  }
);

export default api;

