import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  Save,
  Send,
  Clock,
  User,
  FileText,
  Search
} from 'lucide-react';
import { 
  getAppointmentById, 
  startConsultation, 
  endConsultation,
  createPrescription 
} from '../api/doctorApi';
import { useToast } from '../context/ToastContext';
import { COMMON_MEDICINES, DOSAGE_FREQUENCIES, DURATION_UNITS } from '../utils/constants';

const Consult = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [appointment, setAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Prescription state
  const [prescription, setPrescription] = useState({
    chiefComplaint: '',
    diagnosis: '',
    notes: '',
    medications: [],
  });

  const [currentMed, setCurrentMed] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    durationUnit: 'Days',
    instructions: '',
  });

  const [medicineSearch, setMedicineSearch] = useState('');
  const [showMedicineSuggestions, setShowMedicineSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const fetchAppointment = async () => {
    try {
      const response = await getAppointmentById(appointmentId);
      setAppointment(response.data);
      setPrescription(prev => ({
        ...prev,
        chiefComplaint: response.data.chiefComplaint || '',
      }));
    } catch (error) {
      showError('Failed to load appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimerToggle = async () => {
    if (!timerRunning) {
      // Starting timer - call backend startConsultation
      try {
        const response = await startConsultation(appointmentId);
        if (response.success) {
          setTimerRunning(true);
          showSuccess('Consultation started');
        }
      } catch (error) {
        showError(error.message || 'Failed to start consultation');
      }
    } else {
      // Pausing timer - just pause locally
      setTimerRunning(false);
    }
  };

  const handleTimerStop = async () => {
    try {
      // End consultation on backend
      const response = await endConsultation(appointmentId);
      if (response.success) {
        setTimerRunning(false);
        showSuccess(`Consultation completed in ${formatTime(elapsedTime)}`);
      }
    } catch (error) {
      showError(error.message || 'Failed to end consultation');
    }
  };

  const handleAddMedication = () => {
    if (!currentMed.name || !currentMed.dosage || !currentMed.frequency) {
      showError('Please fill in medicine name, dosage, and frequency');
      return;
    }

    setPrescription(prev => ({
      ...prev,
      medications: [...prev.medications, { ...currentMed, id: Date.now() }],
    }));

    setCurrentMed({
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      durationUnit: 'Days',
      instructions: '',
    });
    setMedicineSearch('');
    showSuccess('Medication added');
  };

  const handleRemoveMedication = (id) => {
    setPrescription(prev => ({
      ...prev,
      medications: prev.medications.filter(med => med.id !== id),
    }));
  };

  const handleMedicineSelect = (medicine) => {
    setCurrentMed(prev => ({
      ...prev,
      name: medicine.name,
      dosage: medicine.strength[0] || '',
    }));
    setMedicineSearch(medicine.name);
    setShowMedicineSuggestions(false);
  };

  const filteredMedicines = COMMON_MEDICINES.filter(med =>
    med.name.toLowerCase().includes(medicineSearch.toLowerCase())
  );

  const handleSavePrescription = async () => {
    if (prescription.medications.length === 0) {
      showError('Please add at least one medication');
      return;
    }

    try {
      setIsSaving(true);
      
      // Prepare prescription data for backend
      const prescriptionData = {
        appointment_id: appointmentId,
        patient_id: appointment?.patient_id || appointment?.patientId,
        medications: prescription.medications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: parseInt(med.duration) || 0,
          duration_unit: med.durationUnit,
          instructions: med.instructions || ''
        })),
        diagnosis: prescription.diagnosis || '',
        notes: prescription.notes || ''
      };
      
      await createPrescription(prescriptionData);
      showSuccess('Prescription saved successfully');
    } catch (error) {
      showError(error.message || 'Failed to save prescription');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPrescription = async () => {
    if (prescription.medications.length === 0) {
      showError('Please add at least one medication');
      return;
    }

    try {
      setIsSaving(true);
      
      // Prepare prescription data for backend
      const prescriptionData = {
        appointment_id: appointmentId,
        patient_id: appointment?.patient_id || appointment?.patientId,
        medications: prescription.medications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: parseInt(med.duration) || 0,
          duration_unit: med.durationUnit,
          instructions: med.instructions || ''
        })),
        diagnosis: prescription.diagnosis || '',
        notes: prescription.notes || ''
      };
      
      // Backend automatically sends notification when prescription is created
      await createPrescription(prescriptionData);
      showSuccess('Prescription sent to patient successfully');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      showError(error.message || 'Failed to send prescription');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Consultation</h1>
            <p className="text-gray-600 mt-1">{appointment?.patientName}</p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg shadow border border-gray-200 px-6 py-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-2xl font-bold text-gray-900 font-mono">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
          {!timerRunning ? (
            <button
              onClick={handleTimerToggle}
              className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors"
              title="Start Timer"
            >
              <Play className="w-5 h-5" />
            </button>
          ) : (
            <>
              <button
                onClick={handleTimerToggle}
                className="bg-yellow-600 hover:bg-yellow-700 text-white p-3 rounded-lg transition-colors"
                title="Pause Timer"
              >
                <Pause className="w-5 h-5" />
              </button>
              <button
                onClick={handleTimerStop}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition-colors"
                title="Stop Timer"
              >
                <Square className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{appointment?.patientName}</h3>
                <p className="text-sm text-gray-600">
                  {appointment?.age} years • {appointment?.gender}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500 mb-1">Chief Complaint</div>
                <div className="text-gray-900">{appointment?.chiefComplaint}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Type</div>
                <div className="text-gray-900 capitalize">{appointment?.type}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Duration</div>
                <div className="text-gray-900">{appointment?.duration} minutes</div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/patient/${appointment?.patientId}`)}
              className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              View Full History
            </button>
          </div>
        </div>

        {/* Right Column - E-Prescription */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clinical Notes */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Clinical Notes
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chief Complaint
                </label>
                <input
                  type="text"
                  value={prescription.chiefComplaint}
                  onChange={(e) =>
                    setPrescription(prev => ({ ...prev, chiefComplaint: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Patient's main complaint"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosis
                </label>
                <input
                  type="text"
                  value={prescription.diagnosis}
                  onChange={(e) =>
                    setPrescription(prev => ({ ...prev, diagnosis: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Primary diagnosis"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={prescription.notes}
                  onChange={(e) =>
                    setPrescription(prev => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional observations and recommendations"
                />
              </div>
            </div>
          </div>

          {/* Medication Builder */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Medications</h3>

            <div className="space-y-4">
              {/* Medicine Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medicine Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={medicineSearch}
                    onChange={(e) => {
                      setMedicineSearch(e.target.value);
                      setCurrentMed(prev => ({ ...prev, name: e.target.value }));
                      setShowMedicineSuggestions(true);
                    }}
                    onFocus={() => setShowMedicineSuggestions(true)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search or type medicine name"
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>

                {/* Autocomplete Suggestions */}
                {showMedicineSuggestions && medicineSearch && filteredMedicines.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredMedicines.map((medicine, index) => (
                      <button
                        key={index}
                        onClick={() => handleMedicineSelect(medicine)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{medicine.name}</div>
                        <div className="text-xs text-gray-500">
                          {medicine.category} • {medicine.strength.join(', ')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    value={currentMed.dosage}
                    onChange={(e) =>
                      setCurrentMed(prev => ({ ...prev, dosage: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 500mg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency *
                  </label>
                  <select
                    value={currentMed.frequency}
                    onChange={(e) =>
                      setCurrentMed(prev => ({ ...prev, frequency: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select frequency</option>
                    {DOSAGE_FREQUENCIES.map(freq => (
                      <option key={freq} value={freq}>
                        {freq}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <input
                    type="number"
                    value={currentMed.duration}
                    onChange={(e) =>
                      setCurrentMed(prev => ({ ...prev, duration: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 7"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={currentMed.durationUnit}
                    onChange={(e) =>
                      setCurrentMed(prev => ({ ...prev, durationUnit: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {DURATION_UNITS.map(unit => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <input
                  type="text"
                  value={currentMed.instructions}
                  onChange={(e) =>
                    setCurrentMed(prev => ({ ...prev, instructions: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Take with food"
                />
              </div>

              <button
                onClick={handleAddMedication}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Medication
              </button>
            </div>
          </div>

          {/* Medications List */}
          {prescription.medications.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Prescribed Medications ({prescription.medications.length})
              </h3>

              <div className="space-y-3">
                {prescription.medications.map((med) => (
                  <div
                    key={med.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{med.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {med.dosage} • {med.frequency}
                        {med.duration && ` • ${med.duration} ${med.durationUnit}`}
                      </div>
                      {med.instructions && (
                        <div className="text-sm text-gray-500 mt-1 italic">
                          {med.instructions}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMedication(med.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSavePrescription}
              disabled={isSaving}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Draft
            </button>
            <button
              onClick={handleSendPrescription}
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:bg-blue-400 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send to Patient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consult;

