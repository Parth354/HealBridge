import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building, Phone, Mail, FileText } from 'lucide-react';
import { createDoctorProfile } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DoctorProfileSetup = () => {
  const navigate = useNavigate();
  const { authToken, user, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user already has profile
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (user?.hasProfile) {
      showSuccess('Profile already exists! Redirecting to dashboard.');
      navigate('/dashboard');
      return;
    }
  }, [isAuthenticated, user, navigate, showSuccess]);
  
  const [formData, setFormData] = useState({
    name: '',
    specialties: ['General Medicine'],
    licenseNo: '',
    experience: '',
    qualification: '',
    clinicName: '',
    clinicAddress: '',
    clinicLat: '',
    clinicLon: '',
    phone: '',
    email: ''
  });

  const specialtyOptions = [
    'General Medicine',
    'Internal Medicine',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Orthopedics',
    'Gynecology',
    'Neurology',
    'Psychiatry',
    'ENT',
    'Ophthalmology',
    'Dentistry'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.licenseNo.trim()) {
      showError('License number is required');
      return;
    }
    
    if (formData.specialties.length === 0) {
      showError('Please select at least one specialty');
      return;
    }
    
    setIsSubmitting(true);

    try {
      await createDoctorProfile(authToken, {
        specialties: formData.specialties,
        licenseNo: formData.licenseNo.trim()
      });

      showSuccess('Profile created successfully!');
      
      // Force auth context refresh
      window.location.href = '/dashboard';
    } catch (error) {
      if (error.message.includes('already exists')) {
        showError('Profile already exists! Redirecting to dashboard.');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        showError(error.message || 'Failed to create profile');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpecialtyChange = (specialty) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
            <p className="text-gray-600 mt-2">
              Please provide your professional details to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* License Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical License Number *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.licenseNo}
                  onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your medical license number"
                  required
                />
              </div>
            </div>

            {/* Specialties */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialties * (Select at least one)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {specialtyOptions.map(specialty => (
                  <label key={specialty} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.specialties.includes(specialty)}
                      onChange={() => handleSpecialtyChange(specialty)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{specialty}</span>
                  </label>
                ))}
              </div>
              {formData.specialties.length === 0 && (
                <p className="text-red-500 text-sm mt-1">Please select at least one specialty</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting || formData.specialties.length === 0 || !formData.licenseNo}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Profile...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfileSetup;