/**
 * Patient Profile Page - Comprehensive Patient View
 * 
 * Features:
 * - Complete patient demographics
 * - Medical history (allergies, conditions)
 * - RAG-generated AI summary
 * - Appointment timeline
 * - Current medications
 * - Document viewer
 * - Real-time updates via WebSocket
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  User, Calendar, Pill, FileText, AlertCircle, 
  Phone, Mail, MapPin, Heart, Activity,
  ChevronLeft, Download, Share2, Edit
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useWebSocketEvent } from '../hooks/useWebSocket';
import PatientTimeline from '../components/PatientTimeline';
import MedicationTracker from '../components/MedicationTracker';
import PatientDocuments from '../components/PatientDocuments';

const PatientProfile = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch patient data
  const { data: patient, isLoading, refetch } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/doctor/patients/${patientId}`);
      return response.data.patient;
    },
    enabled: !!patientId
  });

  // Fetch RAG summary
  const { data: summary } = useQuery({
    queryKey: ['patient-summary', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/doctor/patients/${patientId}/summary`);
      return response.data.summary;
    },
    enabled: !!patientId
  });

  // Real-time updates
  useWebSocketEvent('patient:updated', (data) => {
    if (data.patientId === patientId) {
      refetch();
    }
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Patient Not Found</h2>
          <button
            onClick={() => navigate('/patients')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'documents', label: 'Documents', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <ChevronLeft size={20} />
          <span className="ml-1">Back to Patients</span>
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={40} className="text-blue-600" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {patient.name || `${patient.firstName} ${patient.lastName}`}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <User size={14} />
                    {calculateAge(patient.dob)} years • {patient.gender || 'N/A'}
                  </span>
                  {patient.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {patient.email}
                    </span>
                  )}
                  {patient.phoneNumber && (
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {patient.phoneNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <Share2 size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <Download size={20} className="text-gray-600" />
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                <Edit size={16} />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                  }
                `}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* AI Summary */}
            {summary && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="text-blue-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-800">AI-Generated Summary</h2>
                  <span className="ml-auto text-xs text-gray-500">
                    Generated by RAG
                  </span>
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    {summary.insights || 'Analyzing patient data...'}
                  </p>
                  
                  {summary.recommendations && summary.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Recommendations:
                      </h3>
                      <ul className="space-y-1">
                        {summary.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            • {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Medical Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Demographics */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User size={20} className="text-blue-600" />
                  Demographics
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date of Birth:</span>
                    <span className="font-medium text-gray-800">
                      {patient.dob ? format(new Date(patient.dob), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age:</span>
                    <span className="font-medium text-gray-800">
                      {calculateAge(patient.dob)} years
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gender:</span>
                    <span className="font-medium text-gray-800">
                      {patient.gender || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Blood Group:</span>
                    <span className="font-medium text-gray-800">
                      {patient.bloodGroup || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Phone size={20} className="text-green-600" />
                  Contact Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600 block mb-1">Phone:</span>
                    <span className="font-medium text-gray-800">
                      {patient.phoneNumber || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Email:</span>
                    <span className="font-medium text-gray-800">
                      {patient.email || 'Not provided'}
                    </span>
                  </div>
                  {patient.address && (
                    <div>
                      <span className="text-gray-600 block mb-1 flex items-center gap-1">
                        <MapPin size={14} />
                        Address:
                      </span>
                      <span className="font-medium text-gray-800">
                        {patient.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              {patient.emergencyContactName && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-600" />
                    Emergency Contact
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium text-gray-800">
                        {patient.emergencyContactName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium text-gray-800">
                        {patient.emergencyContactPhone}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Medical History */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Heart size={20} className="text-red-600" />
                  Medical History
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600 block mb-2">Allergies:</span>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies && patient.allergies.length > 0 ? (
                        patient.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium"
                          >
                            {allergy}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">None reported</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-600 block mb-2">Chronic Conditions:</span>
                    <div className="flex flex-wrap gap-2">
                      {patient.conditions && patient.conditions.length > 0 ? (
                        patient.conditions.map((condition, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium"
                          >
                            {condition}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">None reported</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 mb-1">Total Visits</div>
                <div className="text-2xl font-bold text-blue-600">
                  {summary?.visitHistory?.totalVisits || 0}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 mb-1">Active Medications</div>
                <div className="text-2xl font-bold text-green-600">
                  {summary?.currentMedications?.length || 0}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 mb-1">Last Visit</div>
                <div className="text-lg font-bold text-gray-800">
                  {summary?.visitHistory?.recentVisits?.[0]?.date
                    ? format(new Date(summary.visitHistory.recentVisits[0].date), 'MMM dd, yyyy')
                    : 'N/A'
                  }
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 mb-1">Documents</div>
                <div className="text-2xl font-bold text-purple-600">
                  {summary?.documents?.length || 0}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'timeline' && (
          <PatientTimeline patientId={patientId} />
        )}

        {activeTab === 'medications' && (
          <MedicationTracker patientId={patientId} />
        )}

        {activeTab === 'documents' && (
          <PatientDocuments patientId={patientId} />
        )}
      </div>
    </div>
  );
};

export default PatientProfile;

