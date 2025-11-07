import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.data || config.params);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;
      
      // Log detailed error info
      console.error(`API Error ${status}:`, data);
      
      switch (status) {
        case 401:
          // Check if it's a "User not found" error for Firebase users
          if (data?.error === 'User not found' && data?.hint?.includes('Firebase')) {
            console.log('Firebase user not registered in backend, attempting auto-registration...');
            // Don't redirect to login, let the app handle Firebase registration
            return Promise.reject({ message: 'FIREBASE_USER_NOT_REGISTERED', status, data });
          }
          // Unauthorized - redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('doctor');
          window.location.href = '/login';
          break;
        case 403:
          console.error('Access forbidden:', data?.error || data?.message);
          break;
        case 404:
          console.error('Resource not found:', data?.error || data?.message);
          break;
        case 500:
          console.error('Server error:', data?.error || data?.message);
          break;
        default:
          console.error('API Error:', data?.error || data?.message || 'Unknown error');
      }
      
      // Return detailed error
      const errorMessage = data?.error || data?.message || `HTTP ${status} Error`;
      return Promise.reject({ message: errorMessage, status, data });
    } else if (error.request) {
      // Network error
      console.error('Network error - please check your connection');
      return Promise.reject({ message: 'Network error' });
    } else {
      console.error('Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default apiClient;

