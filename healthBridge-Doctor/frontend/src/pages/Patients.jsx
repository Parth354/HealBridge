import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  Phone,
  Calendar,
  Activity,
  ChevronRight,
  Filter,
  Download,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { getAppointments } from '../api/doctorApi';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/SkeletonLoader';

const Patients = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, recent, frequent

  useEffect(() => {
    // Only fetch once on mount
    if (patients.length === 0) {
      fetchPatients();
    }
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchTerm, filterType, patients]);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all appointments to get patient data
      const response = await getAppointments();
      
      if (response.success && response.data) {
        // Extract unique patients from appointments
        const patientMap = new Map();
        
        response.data.forEach(appointment => {
          const patientId = appointment.patient_id;
          const patientName = appointment.patient?.name || `Patient ${patientId}`;
          const patientPhone = appointment.patient?.phone || 'N/A';
          const patientAge = appointment.patient?.age;
          const patientGender = appointment.patient?.gender;
          
          if (!patientMap.has(patientId)) {
            patientMap.set(patientId, {
              id: patientId,
              name: patientName,
              phone: patientPhone,
              age: patientAge,
              gender: patientGender,
              appointments: [],
              lastVisit: null,
              nextAppointment: null,
              totalVisits: 0,
              status: 'active'
            });
          }
          
          const patient = patientMap.get(patientId);
          patient.appointments.push(appointment);
          patient.totalVisits = patient.appointments.length;
          
          // Find last and next appointments
          const appointmentDate = new Date(appointment.startTs);
          const now = new Date();
          
          if (appointmentDate < now) {
            if (!patient.lastVisit || appointmentDate > new Date(patient.lastVisit)) {
              patient.lastVisit = appointmentDate.toISOString();
            }
          } else {
            if (!patient.nextAppointment || appointmentDate < new Date(patient.nextAppointment)) {
              patient.nextAppointment = appointmentDate.toISOString();
            }
          }
        });
        
        const patientsArray = Array.from(patientMap.values()).sort((a, b) => {
          // Sort by last visit date (most recent first)
          const aDate = new Date(a.lastVisit || 0);
          const bDate = new Date(b.lastVisit || 0);
          return bDate - aDate;
        });
        
        setPatients(patientsArray);
      }
    } catch (error) {
      setError(error.message || 'Failed to load patients');
      showError('Failed to load patients');
      console.error('Fetch patients error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPatients = () => {
    let filtered = [...patients];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone.includes(searchTerm) ||
        patient.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filterType === 'recent') {
      // Patients with appointments in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(patient => 
        patient.lastVisit && new Date(patient.lastVisit) > thirtyDaysAgo
      );
    } else if (filterType === 'frequent') {
      // Patients with 3+ visits
      filtered = filtered.filter(patient => patient.totalVisits >= 3);
    }
    
    setFilteredPatients(filtered);
  };

  const handlePatientClick = (patient) => {
    // Find most recent appointment to view details
    const recentAppointment = patient.appointments[0];
    if (recentAppointment) {
      navigate(`/patient/${recentAppointment.id}`);
    }
  };

  const getStatusColor = (patient) => {
    if (patient.nextAppointment) return 'text-green-600 bg-green-50';
    if (patient.lastVisit) {
      const daysSinceLastVisit = Math.floor(
        (new Date() - new Date(patient.lastVisit)) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastVisit < 30) return 'text-blue-600 bg-blue-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const filters = [
    { label: 'All Patients', value: 'all' },
    { label: 'Recent (30 days)', value: 'recent' },
    { label: 'Frequent (3+ visits)', value: 'frequent' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-600 mt-1">
            View and manage your patient records
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setPatients([]);
              fetchPatients();
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto">
            {filters.map(filter => (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filterType === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {filter.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredPatients.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{patients.length}</span> patients
          </p>
        </div>
      </div>

      {/* Patients List */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Patients</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setPatients([]);
              fetchPatients();
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonLoader key={i} variant="card" className="h-32" />
          ))}
        </div>
      ) : filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => handlePatientClick(patient)}
              className="bg-white rounded-lg shadow border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
            >
              {/* Patient Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {patient.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {patient.age ? `${patient.age} yrs` : 'Age N/A'} • {patient.gender || 'N/A'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>

              {/* Patient Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{patient.phone}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Activity className="w-4 h-4" />
                  <span>{patient.totalVisits} visit{patient.totalVisits !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Last: {formatDate(patient.lastVisit)}</span>
                </div>
              </div>

              {/* Next Appointment Badge */}
              {patient.nextAppointment && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Next appointment:</span>
                    <span className="text-xs font-medium text-green-600">
                      {formatDate(patient.nextAppointment)}
                    </span>
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div className="mt-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(patient)}`}>
                  {patient.nextAppointment ? 'Upcoming' : patient.lastVisit ? 'Previous Patient' : 'New Patient'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterType !== 'all' ? 'No patients found' : 'No patients yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Patients will appear here once you start consultations'}
          </p>
          {(searchTerm || filterType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {!isLoading && patients.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Statistics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-blue-600">{patients.length}</div>
              <div className="text-sm text-gray-600">Total Patients</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {patients.filter(p => p.nextAppointment).length}
              </div>
              <div className="text-sm text-gray-600">With Upcoming Appointments</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">
                {patients.filter(p => p.totalVisits >= 3).length}
              </div>
              <div className="text-sm text-gray-600">Frequent Patients (3+ visits)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;

