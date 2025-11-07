import { createContext, useState, useContext, useEffect } from 'react';
import { sendOTP, sendEmailOTP, verifyOTP, getCurrentUser } from '../api/authApi';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const [pendingAuth, setPendingAuth] = useState(null); // Store phone/email for OTP verification

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      const storedToken = sessionStorage.getItem('authToken');
      const storedUser = sessionStorage.getItem('doctor');
      
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setAuthToken(storedToken);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          // Optionally verify token with backend
          try {
            const response = await getCurrentUser(storedToken);
            if (response.success && response.user) {
              // Update with fresh user data from backend
              const updatedUser = transformBackendUser(response.user);
              setUser(updatedUser);
              sessionStorage.setItem('doctor', JSON.stringify(updatedUser));
            }
          } catch (error) {
            console.error('Token validation failed:', error);
            // Token invalid, clear session
            logout();
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
          sessionStorage.removeItem('doctor');
          sessionStorage.removeItem('authToken');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Transform backend user data to frontend format
  const transformBackendUser = (backendUser) => {
    return {
      id: backendUser.id,
      name: backendUser.doctor?.name || 'Dr. User',
      specialization: backendUser.doctor?.specialties || 'General Practice',
      email: backendUser.email || '',
      phone: backendUser.phone,
      clinics: backendUser.doctor?.clinics?.map(clinic => ({
        id: clinic.id,
        name: clinic.name,
        location: clinic.address
      })) || [],
      selectedClinic: backendUser.doctor?.clinics?.[0] ? {
        id: backendUser.doctor.clinics[0].id,
        name: backendUser.doctor.clinics[0].name
      } : null,
      registrationNumber: backendUser.doctor?.licenseNo || 'N/A',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(backendUser.doctor?.name || 'Doctor')}&background=2563eb&color=fff`,
      role: backendUser.role,
      verified: backendUser.verified,
      hasProfile: backendUser.hasProfile
    };
  };

  // Send OTP to phone or email
  const sendOTPCode = async (identifier, type = 'phone') => {
    try {
      let response;
      if (type === 'email') {
        response = await sendEmailOTP(identifier);
      } else {
        response = await sendOTP(identifier);
      }

      if (response.success) {
        // Store the identifier for OTP verification
        setPendingAuth({ identifier, type });
        return { success: true, message: 'OTP sent successfully' };
      }
      
      return { success: false, error: 'Failed to send OTP' };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, error: error.message };
    }
  };

  // Verify OTP and login
  const verifyOTPCode = async (otp) => {
    try {
      if (!pendingAuth) {
        throw new Error('No pending authentication. Please request OTP first.');
      }

      const response = await verifyOTP(pendingAuth.identifier, otp, 'DOCTOR');
      
      if (response.success && response.token) {
        // Store token
        setAuthToken(response.token);
        sessionStorage.setItem('authToken', response.token);
        
        // Transform and store user
        const transformedUser = transformBackendUser(response.user);
        setUser(transformedUser);
        setIsAuthenticated(true);
        sessionStorage.setItem('doctor', JSON.stringify(transformedUser));
        
        // Clear pending auth
        setPendingAuth(null);
        
        return { success: true, user: transformedUser, needsProfile: !response.user.hasProfile };
      }
      
      return { success: false, error: 'Verification failed' };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthToken(null);
    setPendingAuth(null);
    sessionStorage.removeItem('doctor');
    sessionStorage.removeItem('authToken');
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    sessionStorage.setItem('doctor', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    authToken,
    pendingAuth,
    sendOTPCode,
    verifyOTPCode,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
