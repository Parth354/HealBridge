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

  // Check if user already has profile - if yes, redirect to dashboard
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // If user already has a profile, redirect to dashboard (don't show profile setup)
    if (user?.hasProfile) {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [isAuthenticated, user, navigate]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    specialties: ['General Medicine'],
    licenseNo: '',
    // Clinic fields (optional)
    addClinic: false,
    clinicName: '',
    clinicAddress: '',
    clinicLat: '',
    clinicLon: '',
    houseVisitRadiusKm: 5
  });
  
  // Pre-fill email from user if available
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user]);

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
      const response = await createDoctorProfile(authToken, {
        specialties: formData.specialties,
        licenseNo: formData.licenseNo.trim()
      });

      showSuccess('Profile created successfully!');
      
      // Update user in localStorage with hasProfile flag
      const storedUser = localStorage.getItem('doctor');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.hasProfile = true;
        if (response.doctor) {
          user.doctorId = response.doctor.id;
          user.registrationNumber = response.doctor.licenseNo;
          user.specialization = Array.isArray(response.doctor.specialties) 
            ? response.doctor.specialties.join(', ') 
            : response.doctor.specialties;
        }
        localStorage.setItem('doctor', JSON.stringify(user));
      }
      
      // Force full page reload to refresh auth context
      window.location.href = '/dashboard';
    } catch (error) {
      if (error.message.includes('already exists')) {
        showError('Profile already exists! Redirecting to dashboard.');
        // Update hasProfile flag even if profile exists
        const storedUser = localStorage.getItem('doctor');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.hasProfile = true;
          localStorage.setItem('doctor', JSON.stringify(user));
        }
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
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
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="doctor@example.com"
                  required
                />
              </div>
            </div>

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

            {/* Optional Clinic Addition */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="addClinic"
                  checked={formData.addClinic}
                  onChange={(e) => setFormData({ ...formData, addClinic: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="addClinic" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Add Clinic (Optional)
                </label>
              </div>

              {formData.addClinic && (
                <div className="ml-6 space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clinic Name *
                    </label>
                    <input
                      type="text"
                      value={formData.clinicName}
                      onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="City Hospital"
                      required={formData.addClinic}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clinic Address *
                    </label>
                    <input
                      type="text"
                      value={formData.clinicAddress}
                      onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="123 Main St, City, State, ZIP"
                      required={formData.addClinic}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Latitude (optional)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.clinicLat}
                        onChange={(e) => setFormData({ ...formData, clinicLat: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="28.6139"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Longitude (optional)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.clinicLon}
                        onChange={(e) => setFormData({ ...formData, clinicLon: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="77.2090"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      House Visit Radius (km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={formData.houseVisitRadiusKm}
                      onChange={(e) => setFormData({ ...formData, houseVisitRadiusKm: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum distance you're willing to travel for house visits
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      💡 <strong>Tip:</strong> You can add more clinics later from Settings. 
                      If you don't have coordinates, leave them blank and update them later.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting || formData.specialties.length === 0 || !formData.licenseNo || !formData.firstName || !formData.lastName || !formData.email}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Profile...' : 'Complete Setup'}
              </button>
              {!formData.addClinic && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  You can add clinics later from Settings
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfileSetup;