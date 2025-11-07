import { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Shield, 
  Plus, 
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  getClinics, 
  addClinic, 
  getVerificationStatus, 
  requestLicenseVerification 
} from '../api/doctorApi';
import SkeletonLoader from '../components/SkeletonLoader';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [clinics, setClinics] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingClinic, setIsAddingClinic] = useState(false);
  
  // New clinic form
  const [newClinic, setNewClinic] = useState({
    name: '',
    address: '',
    lat: '',
    lon: '',
    houseVisitRadiusKm: 5
  });

  useEffect(() => {
    if (activeTab === 'clinics') {
      fetchClinics();
    } else if (activeTab === 'verification') {
      fetchVerificationStatus();
    }
  }, [activeTab]);

  const fetchClinics = async () => {
    try {
      setIsLoading(true);
      const response = await getClinics();
      if (response.success) {
        setClinics(response.data);
      }
    } catch (error) {
      showError('Failed to load clinics');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      setIsLoading(true);
      const response = await getVerificationStatus();
      setVerificationStatus(response);
    } catch (error) {
      showError('Failed to load verification status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClinic = async (e) => {
    e.preventDefault();
    
    if (!newClinic.name || !newClinic.address) {
      showError('Please fill in clinic name and address');
      return;
    }

    try {
      setIsAddingClinic(true);
      const response = await addClinic(newClinic);
      
      if (response.success) {
        showSuccess('Clinic added successfully');
        setClinics([...clinics, response.data]);
        setNewClinic({
          name: '',
          address: '',
          lat: '',
          lon: '',
          houseVisitRadiusKm: 5
        });
      }
    } catch (error) {
      showError(error.message || 'Failed to add clinic');
    } finally {
      setIsAddingClinic(false);
    }
  };

  const handleRequestVerification = async () => {
    try {
      const response = await requestLicenseVerification();
      showSuccess('Verification request submitted successfully');
      fetchVerificationStatus();
    } catch (error) {
      showError(error.message || 'Failed to request verification');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'clinics', label: 'Clinics', icon: Building2 },
    { id: 'verification', label: 'Verification', icon: Shield },
  ];

  const getVerificationStatusBadge = () => {
    if (!verificationStatus) return null;
    
    const status = verificationStatus.verifiedStatus;
    
    if (status === 'VERIFIED') {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Verified</span>
        </div>
      );
    } else if (status === 'PENDING') {
      return (
        <div className="flex items-center gap-2 text-yellow-600">
          <Clock className="w-5 h-5" />
          <span className="font-medium">Pending</span>
        </div>
      );
    } else if (status === 'REJECTED') {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">Rejected</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-5 h-5" />
          <span className="font-medium">Not Requested</span>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile, clinics, and verification</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-1 p-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <img
                  src={user?.avatar}
                  alt={user?.name}
                  className="w-20 h-20 rounded-full border-4 border-blue-200"
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{user?.name}</h3>
                  <p className="text-gray-600">{user?.specialization}</p>
                  <p className="text-sm text-gray-500">{user?.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={user?.registrationNumber || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={user?.specialization || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={user?.phone || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  To update your profile information, please contact support.
                </p>
              </div>
            </div>
          )}

          {/* Clinics Tab */}
          {activeTab === 'clinics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Your Clinics</h3>
                <span className="text-sm text-gray-600">{clinics.length} clinic(s)</span>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <SkeletonLoader key={i} variant="card" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Existing Clinics */}
                  {clinics.length > 0 ? (
                    <div className="space-y-4">
                      {clinics.map(clinic => (
                        <div
                          key={clinic.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{clinic.name}</h4>
                              <p className="text-sm text-gray-600 mt-1 flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {clinic.address}
                              </p>
                              {clinic.houseVisitRadiusKm && (
                                <p className="text-xs text-gray-500 mt-2">
                                  House visit radius: {clinic.houseVisitRadiusKm} km
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No clinics added yet</p>
                    </div>
                  )}

                  {/* Add New Clinic Form */}
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4">Add New Clinic</h4>
                    <form onSubmit={handleAddClinic} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Clinic Name *
                          </label>
                          <input
                            type="text"
                            value={newClinic.name}
                            onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Heart Care Clinic"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            House Visit Radius (km)
                          </label>
                          <input
                            type="number"
                            value={newClinic.houseVisitRadiusKm}
                            onChange={(e) => setNewClinic({ ...newClinic, houseVisitRadiusKm: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="1"
                            max="50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address *
                        </label>
                        <textarea
                          value={newClinic.address}
                          onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          placeholder="Sector 12, Dwarka, New Delhi - 110075"
                          required
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
                            value={newClinic.lat}
                            onChange={(e) => setNewClinic({ ...newClinic, lat: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="28.5921"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Longitude (optional)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={newClinic.lon}
                            onChange={(e) => setNewClinic({ ...newClinic, lon: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="77.0460"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isAddingClinic}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:bg-blue-400 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {isAddingClinic ? 'Adding...' : 'Add Clinic'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Verification Tab */}
          {activeTab === 'verification' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">License Verification</h3>
                {getVerificationStatusBadge()}
              </div>

              {isLoading ? (
                <SkeletonLoader variant="card" className="h-48" />
              ) : (
                <div className="space-y-6">
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4">Verification Details</h4>
                    
                    {verificationStatus ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-medium">{verificationStatus.verifiedStatus || 'Not Requested'}</span>
                        </div>
                        {verificationStatus.requestedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Requested At:</span>
                            <span className="font-medium">
                              {new Date(verificationStatus.requestedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {verificationStatus.verifiedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Verified At:</span>
                            <span className="font-medium">
                              {new Date(verificationStatus.verifiedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600">No verification information available</p>
                    )}
                  </div>

                  {(!verificationStatus || verificationStatus.verifiedStatus !== 'VERIFIED') && (
                    <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Request Verification</h4>
                      <p className="text-sm text-blue-800 mb-4">
                        Get your medical license verified to access all platform features and build patient trust.
                      </p>
                      <button
                        onClick={handleRequestVerification}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        {verificationStatus?.verifiedStatus === 'PENDING' 
                          ? 'Request Again' 
                          : 'Request Verification'}
                      </button>
                    </div>
                  )}

                  {verificationStatus?.verifiedStatus === 'VERIFIED' && (
                    <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                          <h4 className="font-semibold text-green-900">Verified Doctor</h4>
                          <p className="text-sm text-green-800">
                            Your medical license has been verified successfully.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

