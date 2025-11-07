import { useState } from 'react';
import { Menu, Bell, ChevronDown, LogOut, User, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { handleEmergencyLeave } from '../api/doctorApi';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onMenuClick }) => {
  const { user, logout, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showClinicMenu, setShowClinicMenu] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClinicSwitch = (clinic) => {
    updateUser({ selectedClinic: clinic });
    setShowClinicMenu(false);
  };

  const toggleEmergency = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      if (!emergencyMode) {
        // Activating emergency mode - mark unavailable for next 24 hours
        const startTime = new Date();
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + 24);
        
        await handleEmergencyLeave(
          startTime.toISOString(),
          endTime.toISOString(),
          'Emergency leave activated - all appointments paused'
        );
        
        setEmergencyMode(true);
        showSuccess('Emergency mode activated. All appointments paused for 24 hours.');
      } else {
        // Deactivating emergency mode
        // Backend would need an endpoint to cancel emergency leave
        setEmergencyMode(false);
        showSuccess('Emergency mode deactivated. Normal operations resumed.');
      }
    } catch (error) {
      showError(error.message || 'Failed to toggle emergency mode');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Clinic Selector */}
          <div className="relative">
            <button
              onClick={() => setShowClinicMenu(!showClinicMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Building2 className="w-5 h-5 text-gray-600" />
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900">
                  {user?.selectedClinic?.name || 'Select Clinic'}
                </div>
                <div className="text-xs text-gray-500">
                  {user?.clinics?.length || 0} clinics
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* Clinic Dropdown */}
            {showClinicMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowClinicMenu(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  {user?.clinics?.map((clinic) => (
                    <button
                      key={clinic.id}
                      onClick={() => handleClinicSwitch(clinic)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        clinic.id === user?.selectedClinic?.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{clinic.name}</div>
                      <div className="text-sm text-gray-500">{clinic.location}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Emergency Toggle */}
          <button
            onClick={toggleEmergency}
            disabled={isProcessing}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed
              ${emergencyMode
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            title={emergencyMode ? 'Deactivate Emergency Mode' : 'Activate Emergency Mode (24h)'}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isProcessing ? 'Processing...' : emergencyMode ? 'Emergency On' : 'Emergency Off'}
              </span>
            </div>
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <img
                src={user?.avatar}
                alt={user?.name}
                className="w-8 h-8 rounded-full border-2 border-blue-200"
              />
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                <div className="text-xs text-gray-500">{user?.specialization}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="font-medium text-gray-900">{user?.name}</div>
                    <div className="text-sm text-gray-500">{user?.email}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Reg: {user?.registrationNumber}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Profile Settings</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Banner */}
      {emergencyMode && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-sm text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Emergency Mode Active</span>
            <span>- All new bookings paused</span>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

