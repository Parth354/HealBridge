/**
 * Settings Page - Doctor Profile Management
 * 
 * Features:
 * - View and update profile (name, email, specialties)
 * - Manage clinics
 * - View verification status
 * - Update registration number
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Building, CheckCircle, Clock, XCircle, Save, Edit2, Plus, MapPin, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  // Fetch doctor profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: async () => {
      const response = await api.get('/api/doctor/profile');
      return response.data.doctor;
    }
  });

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    specialties: []
  });

  // Clinic form state
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [clinicFormData, setClinicFormData] = useState({
    name: '',
    address: '',
    lat: '',
    lon: '',
    houseVisitRadiusKm: 5
  });

  // Update form when profile loads
  useEffect(() => {
    if (profileData) {
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.user?.email || '',
        specialties: profileData.specialties || []
      });
    }
  }, [profileData]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/api/doctor/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate queries to refetch profile
      queryClient.invalidateQueries(['doctor-profile']);
      
      // Update localStorage and AuthContext with new name
      const storedUser = localStorage.getItem('doctor');
      if (storedUser && data.doctor) {
        const user = JSON.parse(storedUser);
        const firstName = data.doctor.firstName || '';
        const lastName = data.doctor.lastName || '';
        const fullName = `Dr. ${firstName} ${lastName}`.trim();
        const displayName = fullName !== 'Dr.' ? fullName : `Dr. ${user.phone || 'User'}`;
        
        // Update user data
        user.name = displayName;
        user.email = data.doctor.user?.email || user.email;
        user.specialization = Array.isArray(data.doctor.specialties) 
          ? data.doctor.specialties.join(', ') 
          : data.doctor.specialties || user.specialization;
        
        // Update avatar with new name
        user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff`;
        
        localStorage.setItem('doctor', JSON.stringify(user));
        
        // Update AuthContext
        updateUser({
          name: displayName,
          email: user.email,
          specialization: user.specialization,
          avatar: user.avatar
        });
      }
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update profile');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClinicChange = (e) => {
    const { name, value } = e.target;
    setClinicFormData(prev => ({ ...prev, [name]: value }));
  };

  // Fetch clinics
  const { data: clinicsData, isLoading: clinicsLoading } = useQuery({
    queryKey: ['doctor-clinics'],
    queryFn: async () => {
      const response = await api.get('/api/doctor/clinics');
      return response.data.clinics;
    }
  });

  // Add clinic mutation
  const addClinicMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/doctor/clinics', {
        ...data,
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon),
        houseVisitRadiusKm: parseInt(data.houseVisitRadiusKm) || 5
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['doctor-clinics']);
      setShowAddClinic(false);
      setClinicFormData({
        name: '',
        address: '',
        lat: '',
        lon: '',
        houseVisitRadiusKm: 5
      });
      alert('Clinic added successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to add clinic');
    }
  });

  const handleAddClinic = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!clinicFormData.name || !clinicFormData.address || !clinicFormData.lat || !clinicFormData.lon) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Validate coordinates
    const lat = parseFloat(clinicFormData.lat);
    const lon = parseFloat(clinicFormData.lon);
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert('Invalid latitude. Must be between -90 and 90');
      return;
    }
    
    if (isNaN(lon) || lon < -180 || lon > 180) {
      alert('Invalid longitude. Must be between -180 and 180');
      return;
    }
    
    addClinicMutation.mutate(clinicFormData);
  };

  const getVerificationStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle size={16} />
            Verified
          </span>
        );
      case 'PENDING':
        return (
          <span className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <Clock size={16} />
            Pending Verification
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <XCircle size={16} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const doctor = profileData;
  const fullName = `Dr. ${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim();
  const displayName = fullName !== 'Dr.' ? fullName : `Dr. ${doctor?.user?.phone || 'Doctor'}`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600">Manage your profile, clinics, and verification</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <User size={18} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('clinics')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
              activeTab === 'clinics'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <Building size={18} />
            Clinics
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
              activeTab === 'verification'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <CheckCircle size={18} />
            Verification
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6">
          {/* Profile Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {doctor?.firstName?.charAt(0) || 'D'}{doctor?.lastName?.charAt(0) || ''}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{displayName}</h2>
                <p className="text-gray-600">{doctor?.specialties?.join(', ') || 'ENT'}</p>
                <p className="text-sm text-gray-500">{doctor?.user?.phone}</p>
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter first name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter last name"
                />
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={doctor?.licenseNo || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  To update your registration number, please contact support.
                </p>
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  value={doctor?.specialties?.join(', ') || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contact support to update specialization
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter email"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={doctor?.user?.phone || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      firstName: doctor?.firstName || '',
                      lastName: doctor?.lastName || '',
                      email: doctor?.user?.email || '',
                      specialties: doctor?.specialties || []
                    });
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>

          {!isEditing && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
              <p>To update your profile information, click "Edit Profile" button above.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'clinics' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Clinics</h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage your clinic locations and consultation areas
              </p>
            </div>
            <button
              onClick={() => setShowAddClinic(!showAddClinic)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Add Clinic
            </button>
          </div>

          {/* Add Clinic Form */}
          {showAddClinic && (
            <form onSubmit={handleAddClinic} className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Add New Clinic</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Clinic Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinic Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={clinicFormData.name}
                    onChange={handleClinicChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., City Medical Center"
                    required
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={clinicFormData.address}
                    onChange={handleClinicChange}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter complete address with city and postal code"
                    required
                  />
                </div>

                {/* Latitude */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lat"
                    value={clinicFormData.lat}
                    onChange={handleClinicChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 28.6139"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be between -90 and 90</p>
                </div>

                {/* Longitude */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lon"
                    value={clinicFormData.lon}
                    onChange={handleClinicChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 77.2090"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be between -180 and 180</p>
                </div>

                {/* House Visit Radius */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home Visit Radius (km)
                  </label>
                  <input
                    type="number"
                    name="houseVisitRadiusKm"
                    value={clinicFormData.houseVisitRadiusKm}
                    onChange={handleClinicChange}
                    min="0"
                    max="50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum distance for home visits from this clinic (default: 5 km)
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={addClinicMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {addClinicMutation.isPending ? 'Adding...' : 'Add Clinic'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddClinic(false);
                    setClinicFormData({
                      name: '',
                      address: '',
                      lat: '',
                      lon: '',
                      houseVisitRadiusKm: 5
                    });
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Helper Note */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> You can get coordinates from Google Maps by right-clicking on a location 
                  and selecting the coordinates to copy them.
                </p>
              </div>
            </form>
          )}

          {/* Clinics List */}
          <div className="space-y-4">
            {clinicsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading clinics...</p>
              </div>
            ) : !clinicsData || clinicsData.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No clinics added yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Add your first clinic to start accepting appointments
                </p>
                <button
                  onClick={() => setShowAddClinic(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Your First Clinic
                </button>
              </div>
            ) : (
              clinicsData.map((clinic) => (
                <div
                  key={clinic.id}
                  className="p-5 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{clinic.name}</h4>
                          <p className="text-sm text-gray-500">
                            Added {new Date(clinic.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="ml-13 space-y-2">
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>{clinic.address}</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">
                            Coordinates: <span className="font-mono text-gray-700">{clinic.lat.toFixed(4)}, {clinic.lon.toFixed(4)}</span>
                          </span>
                          <span className="text-gray-500">
                            Home visits: <span className="font-medium text-gray-700">{clinic.houseVisitRadiusKm} km</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => window.open(`https://www.google.com/maps?q=${clinic.lat},${clinic.lon}`, '_blank')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View on Google Maps"
                      >
                        <MapPin size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Info Box */}
          {clinicsData && clinicsData.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You have {clinicsData.length} clinic{clinicsData.length !== 1 ? 's' : ''} configured. 
                Patients will be able to book appointments at any of these locations.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Verification Status</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">License Verification</h4>
                <p className="text-sm text-gray-600">Medical license: {doctor?.licenseNo}</p>
              </div>
              {getVerificationStatusBadge(doctor?.verifiedStatus)}
            </div>

            {doctor?.verifiedStatus === 'PENDING' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Verification Pending</h4>
                <p className="text-sm text-yellow-700">
                  Your verification is currently under review. This process typically takes 2-3 business days. 
                  You will be notified once your account is verified.
                </p>
              </div>
            )}

            {doctor?.verifiedStatus === 'VERIFIED' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Account Verified</h4>
                <p className="text-sm text-green-700">
                  Your medical license has been verified. You can now access all features.
                </p>
              </div>
            )}

            {doctor?.verifiedStatus === 'REJECTED' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Verification Rejected</h4>
                <p className="text-sm text-red-700">
                  Your verification was not approved. Please contact support for more information.
                </p>
                <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                  Contact Support
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
