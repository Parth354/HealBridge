import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Activity,
  FileText,
  Send,
  Loader2,
  Heart,
  Droplet,
  Thermometer,
  Wind
} from 'lucide-react';
import { getPatientContext, queryPatientHistory } from '../api/doctorApi';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/SkeletonLoader';

const PatientSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();
  const chatEndRef = useRef(null);

  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // RAG Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchPatientData = async () => {
    try {
      setIsLoading(true);
      // ID here is appointmentId, use it to get patient context
      const response = await getPatientContext(id);
      
      if (response.success && response.data) {
        // Transform backend patient context to frontend format
        const contextData = response.data;
        const transformedPatient = {
          id: contextData.patient?.id || id,
          name: contextData.patient?.name || 'Unknown Patient',
          age: contextData.patient?.age || 'N/A',
          gender: contextData.patient?.gender || 'N/A',
          phone: contextData.patient?.phone || 'N/A',
          email: contextData.patient?.email || 'N/A',
          bloodGroup: contextData.patient?.bloodGroup || 'N/A',
          address: contextData.patient?.address || 'N/A',
          medicalHistory: contextData.medicalHistory || [],
          currentMedications: contextData.currentMedications || [],
          allergies: contextData.allergies || [],
          vitals: contextData.vitals || {
            bloodPressure: 'N/A',
            heartRate: 'N/A',
            temperature: 'N/A',
            oxygenSaturation: 'N/A',
            weight: 'N/A',
            bmi: 'N/A',
            lastUpdated: new Date().toISOString()
          },
          recentLabs: contextData.recentLabs || [],
          appointments: contextData.appointments || []
        };
        setPatient(transformedPatient);
      }
    } catch (error) {
      showError('Failed to load patient data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !patient?.id) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    const query = chatInput;
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Use real backend RAG query
      const response = await queryPatientHistory(patient.id, query);
      
      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: response.data.answer || response.data.results || response.data,
          sources: response.data.sources || [],
          timestamp: new Date(),
        };

        setChatMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      showError(error.message || 'Failed to query patient history');
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I encountered an error processing your query. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="title" className="w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonLoader variant="card" className="h-64" />
            <SkeletonLoader variant="card" className="h-64" />
          </div>
          <SkeletonLoader variant="card" className="h-96" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Patient not found</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'Medical History' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'labs', label: 'Lab Results' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Summary</h1>
          <p className="text-gray-600 mt-1">Complete medical overview</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient Info & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
                <p className="text-gray-600 mt-1">
                  {patient.age} years • {patient.gender} • Blood Group: {patient.bloodGroup}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{patient.email}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 md:col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span>{patient.address}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex gap-1 p-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Current Medications */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Current Medications
                    </h3>
                    <div className="space-y-2">
                      {patient.currentMedications.map((med, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-900">{med.name}</div>
                          <div className="text-sm text-gray-600">
                            {med.dosage} • {med.frequency}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Allergies */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-red-600" />
                      Allergies
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((allergy, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200"
                        >
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Medical History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {patient.medicalHistory.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-900">{item}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Vitals Tab */}
              {activeTab === 'vitals' && (
                <div>
                  <div className="text-sm text-gray-500 mb-4">
                    Last updated: {new Date(patient.vitals.lastUpdated).toLocaleString()}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <VitalCard
                      icon={Heart}
                      label="Blood Pressure"
                      value={patient.vitals.bloodPressure}
                      unit="mmHg"
                      color="text-red-600"
                      bgColor="bg-red-100"
                    />
                    <VitalCard
                      icon={Activity}
                      label="Heart Rate"
                      value={patient.vitals.heartRate}
                      unit="bpm"
                      color="text-pink-600"
                      bgColor="bg-pink-100"
                    />
                    <VitalCard
                      icon={Thermometer}
                      label="Temperature"
                      value={patient.vitals.temperature}
                      unit="°F"
                      color="text-orange-600"
                      bgColor="bg-orange-100"
                    />
                    <VitalCard
                      icon={Wind}
                      label="O2 Saturation"
                      value={patient.vitals.oxygenSaturation}
                      unit="%"
                      color="text-blue-600"
                      bgColor="bg-blue-100"
                    />
                    <VitalCard
                      icon={Droplet}
                      label="Weight"
                      value={patient.vitals.weight}
                      unit="kg"
                      color="text-purple-600"
                      bgColor="bg-purple-100"
                    />
                    <VitalCard
                      icon={Activity}
                      label="BMI"
                      value={patient.vitals.bmi}
                      unit=""
                      color="text-green-600"
                      bgColor="bg-green-100"
                    />
                  </div>
                </div>
              )}

              {/* Lab Results Tab */}
              {activeTab === 'labs' && (
                <div className="space-y-3">
                  {patient.recentLabs.map((lab, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{lab.test}</div>
                        <div className="text-sm text-gray-600">
                          {lab.value} • {new Date(lab.date).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          lab.status === 'Normal'
                            ? 'bg-green-100 text-green-800'
                            : lab.status === 'High'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {lab.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - RAG Chat */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-[700px]">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Ask About Patient</h3>
              <p className="text-sm text-gray-600 mt-1">
                Query medical records with AI
              </p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Ask questions about medications, history, or lab results
                  </p>
                </div>
              ) : (
                <>
                  {chatMessages.map(message => (
                    <div key={message.id}>
                      {message.type === 'user' ? (
                        <div className="flex justify-end">
                          <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
                            {message.content}
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 max-w-[80%]">
                            {typeof message.content === 'string' ? (
                              <div className="text-sm">{message.content}</div>
                            ) : Array.isArray(message.content) ? (
                              message.content.map((result, idx) => (
                                <div key={idx} className="mb-3 last:mb-0">
                                  <div className="text-xs text-gray-500 mb-1">
                                    {result.source} • {result.date ? new Date(result.date).toLocaleDateString() : 'Recent'}
                                  </div>
                                  <div className="text-sm">{result.content || result.text}</div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm">{JSON.stringify(message.content)}</div>
                            )}
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-300">
                                <div className="text-xs text-gray-500">Sources:</div>
                                {message.sources.map((source, idx) => (
                                  <div key={idx} className="text-xs text-gray-600 mt-1">
                                    • {source}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about patient data..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const VitalCard = ({ icon: Icon, label, value, unit, color, bgColor }) => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        <div className={`${bgColor} p-2 rounded-lg`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-xl font-bold text-gray-900">
            {value} <span className="text-sm font-normal text-gray-600">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientSummary;

