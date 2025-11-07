/**
 * Patient Timeline Component - Visual History of Visits
 * 
 * Features:
 * - Chronological timeline of appointments
 * - Visual indicators for visit types
 * - Expandable details for each visit
 * - Prescription and diagnosis info
 * - Filter by date range
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle, XCircle, FileText, Pill, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

const PatientTimeline = ({ patientId }) => {
  const [expandedVisit, setExpandedVisit] = useState(null);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['patient-appointments', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/doctor/patients/${patientId}/appointments`);
      return response.data.appointments || [];
    }
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'CANCELLED':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Calendar className="text-blue-500" size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">No appointment history available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Calendar size={24} className="text-blue-600" />
        Appointment Timeline
      </h2>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        <div className="space-y-4">
          {appointments.map((appointment, index) => {
            const isExpanded = expandedVisit === appointment.id;
            
            return (
              <div key={appointment.id} className="relative pl-14">
                {/* Timeline dot */}
                <div className="absolute left-4 top-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full"></div>

                {/* Card */}
                <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(appointment.status)}
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {format(new Date(appointment.startTs), 'MMM dd, yyyy • HH:mm')}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {appointment.visitType} • {appointment.clinic?.name}
                          </p>
                        </div>
                      </div>

                      {appointment.diagnosis && (
                        <p className="text-sm text-gray-700 mt-2">
                          <strong>Diagnosis:</strong> {appointment.diagnosis}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                      
                      {(appointment.prescription || appointment.notes) && (
                        <button
                          onClick={() => setExpandedVisit(isExpanded ? null : appointment.id)}
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      {appointment.notes && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                            <FileText size={14} />
                            Consultation Notes:
                          </h4>
                          <p className="text-sm text-gray-600">{appointment.notes}</p>
                        </div>
                      )}

                      {appointment.prescription && appointment.prescription.medications && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            <Pill size={14} />
                            Medications Prescribed:
                          </h4>
                          <div className="space-y-2">
                            {appointment.prescription.medications.map((med, idx) => (
                              <div key={idx} className="bg-white p-2 rounded text-sm">
                                <div className="font-medium text-gray-800">{med.name}</div>
                                <div className="text-gray-600">
                                  {med.strength} • {med.freq} • {med.durationDays} days
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {appointment.prescription?.pdfUrl && (
                        <a
                          href={appointment.prescription.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <FileText size={14} />
                          View Prescription PDF
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {appointments.length}
            </div>
            <div className="text-sm text-gray-600">Total Visits</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {appointments.filter(a => a.status === 'COMPLETED').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {appointments.filter(a => a.status === 'CANCELLED').length}
            </div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientTimeline;

