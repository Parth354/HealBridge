import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Verify = () => {
  const navigate = useNavigate();
  const { isAuthenticated, verifyOTPCode, pendingAuth, sendOTPCode } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isVerified) {
      // Already authenticated, redirect to dashboard
      navigate('/dashboard');
    }
    
    // Check if there's a pending auth
    if (!pendingAuth) {
      showError('No pending authentication. Please login first.');
      navigate('/login');
    }
  }, [isAuthenticated, pendingAuth, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all fields filled
    if (index === 5 && value) {
      handleVerify([...newOtp.slice(0, 5), value]);
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (otpValues = otp) => {
    const otpString = otpValues.join('');
    
    if (otpString.length !== 6) {
      showError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);

    try {
      // Call real backend verification
      const result = await verifyOTPCode(otpString);
      
      if (result.success) {
        setIsVerified(true);
        showSuccess('Verification successful!');
        
        // Check if user needs to complete profile
        if (result.needsProfile) {
          showInfo('Please complete your profile');
          setTimeout(() => {
            navigate('/settings'); // Or a dedicated profile completion page
          }, 1500);
        } else {
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        }
      } else {
        showError(result.error || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
      }
    } catch (error) {
      showError(error.message || 'Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingAuth) {
      showError('Session expired. Please login again.');
      navigate('/login');
      return;
    }

    try {
      const result = await sendOTPCode(pendingAuth.identifier, pendingAuth.type);
      
      if (result.success) {
        setResendTimer(30);
        showSuccess('OTP resent successfully!');
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
      } else {
        showError(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      showError('Failed to resend OTP');
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verified Successfully!
          </h1>
          <p className="text-gray-600">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to login</span>
        </button>

        {/* Verify Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verify OTP
            </h1>
            <p className="text-gray-600">
              Enter the 6-digit code sent to
            </p>
            {pendingAuth && (
              <p className="text-gray-900 font-medium mt-1">
                {pendingAuth.identifier}
              </p>
            )}
          </div>

          {/* OTP Input */}
          <div className="flex gap-2 justify-center mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                disabled={isLoading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify()}
            disabled={isLoading || otp.join('').length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify OTP'
            )}
          </button>

          {/* Resend Section */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-600">
                Resend OTP in <span className="font-medium text-blue-600">{resendTimer}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Resend OTP
              </button>
            )}
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 text-center">
              OTP is valid for 5 minutes. Check your {pendingAuth?.type || 'phone'} for the code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verify;

