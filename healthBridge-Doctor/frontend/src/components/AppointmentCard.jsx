import { Clock, User, Phone, MapPin, Video, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { APPOINTMENT_STATUS, STATUS_COLORS } from '../utils/constants';
import { useNavigate } from 'react-router-dom';

const AppointmentCard = ({ appointment, onAction }) => {
  const navigate = useNavigate();

  const getStatusLabel = (status) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleStartConsult = () => {
    navigate(`/consult/${appointment.id}`);
  };

  const handleViewPatient = () => {
    navigate(`/patient/${appointment.patientId}`);
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {appointment.patient?.name || 'Patient'}
            </h3>
            <p className="text-sm text-gray-600">
              ID: {appointment.patient_id || 'N/A'}
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            STATUS_COLORS[appointment.status]
          }`}
        >
          {getStatusLabel(appointment.status)}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>
            {format(new Date(appointment.startTs), 'hh:mm a')} - {format(new Date(appointment.endTs), 'hh:mm a')}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span>{appointment.visitType || 'CLINIC'} Visit</span>
        </div>

        {appointment.visitType === 'TELE' && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Video className="w-4 h-4 text-gray-400" />
            <span>Telemedicine</span>
          </div>
        )}

        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
          <span className="flex-1">Fee: ₹{appointment.feeMock || 500}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        {appointment.status === 'CONFIRMED' && (
          <button
            onClick={handleStartConsult}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Start Consult
          </button>
        )}
        
        {appointment.status === 'STARTED' && (
          <button
            onClick={handleStartConsult}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Continue Consult
          </button>
        )}

        {appointment.status === 'HOLD' && (
          <button
            onClick={() => onAction?.('confirm', appointment.id)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Confirm
          </button>
        )}

        <button
          onClick={handleViewPatient}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          View Details
        </button>

        {(appointment.status === 'HOLD' || 
          appointment.status === 'CONFIRMED') && (
          <button
            onClick={() => onAction?.('cancel', appointment.id)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Wait Time Indicator */}
      {appointment.status === 'CONFIRMED' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Status: <span className="font-medium text-gray-700">Ready for consultation</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;

