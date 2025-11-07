/**
 * Medication Tracker Component
 * 
 * Features:
 * - Current active medications
 * - Medication history
 * - Adherence tracking
 * - Refill reminders
 * - Interactions warnings
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pill, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import api from '../services/api';

const MedicationTracker = ({ patientId }) => {
  const [filter, setFilter] = useState('active'); // 'active', 'all', 'completed'

  const { data: medications, isLoading } = useQuery({
    queryKey: ['patient-medications', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/doctor/patients/${patientId}/medications`);
      return response.data.medications || [];
    }
  });

  const filterMedications = (meds) => {
    if (!meds) return [];
    
    const now = new Date();
    
    return meds.filter(med => {
      const startDate = new Date(med.startDate);
      const endDate = addDays(startDate, med.durationDays);
      const isActive = endDate > now;

      switch (filter) {
        case 'active':
          return isActive;
        case 'completed':
          return !isActive;
        default:
          return true;
      }
    });
  };

  const getMedicationStatus = (med) => {
    const startDate = new Date(med.startDate);
    const endDate = addDays(startDate, med.durationDays);
    const now = new Date();
    const daysRemaining = differenceInDays(endDate, now);

    if (daysRemaining < 0) {
      return { status: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' };
    } else if (daysRemaining <= 3) {
      return { status: 'ending', label: `Ending in ${daysRemaining} days`, color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { status: 'active', label: `${daysRemaining} days left`, color: 'bg-green-100 text-green-800' };
    }
  };

  const getMedicationProgress = (med) => {
    const startDate = new Date(med.startDate);
    const endDate = addDays(startDate, med.durationDays);
    const now = new Date();
    const totalDays = med.durationDays;
    const daysPassed = differenceInDays(now, startDate);
    
    if (daysPassed < 0) return 0;
    if (daysPassed > totalDays) return 100;
    
    return (daysPassed / totalDays) * 100;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const filteredMeds = filterMedications(medications);

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Pill size={24} className="text-blue-600" />
            Medications
          </h2>

          <div className="flex gap-2">
            {['active', 'all', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Medications List */}
      {filteredMeds.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <Pill className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No {filter} medications</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMeds.map((med) => {
            const status = getMedicationStatus(med);
            const progress = getMedicationProgress(med);

            return (
              <div key={med.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{med.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {med.strength} • {med.form} • {med.route}
                    </p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {/* Dosage Info */}
                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-600">Frequency:</span>
                    <span className="ml-2 font-medium text-gray-800">{med.freq}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className="ml-2 font-medium text-gray-800">{med.durationDays} days</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Started:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {format(new Date(med.startDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ends:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {format(addDays(new Date(med.startDate), med.durationDays), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                {status.status !== 'completed' && (
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          status.status === 'ending' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {Math.floor(progress)}% completed
                    </div>
                  </div>
                )}

                {/* Reminders */}
                {med.remindersEnabled && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    <CheckCircle size={14} />
                    <span>Reminders enabled</span>
                  </div>
                )}

                {/* Instructions */}
                {med.instructions && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    <strong className="text-gray-700">Instructions:</strong>
                    <p className="text-gray-600 mt-1">{med.instructions}</p>
                  </div>
                )}

                {/* Refill Alert */}
                {status.status === 'ending' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                    <AlertTriangle size={14} />
                    <span>Refill may be needed soon</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {medications && medications.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {medications.filter(m => {
                  const endDate = addDays(new Date(m.startDate), m.durationDays);
                  return endDate > new Date();
                }).length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {medications.length}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {medications.filter(m => {
                  const endDate = addDays(new Date(m.startDate), m.durationDays);
                  const daysLeft = differenceInDays(endDate, new Date());
                  return daysLeft <= 3 && daysLeft > 0;
                }).length}
              </div>
              <div className="text-sm text-gray-600">Ending Soon</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationTracker;

