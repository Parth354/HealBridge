import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAppointments, 
  startConsultation, 
  endConsultation,
  getPatientContext 
} from '../api/doctorApi';
import { useToast } from '../context/ToastContext';

// Get appointments for a specific date
export const useAppointments = (date) => {
  const { showError } = useToast();

  return useQuery({
    queryKey: ['appointments', date],
    queryFn: async () => {
      const result = await getAppointments(date);
      
      // Validate and clean data
      const appointments = (result.data || []).map(apt => ({
        ...apt,
        id: apt.id || `temp-${Date.now()}`,
        patient_id: apt.patient_id || 'unknown',
        startTs: apt.startTs || new Date().toISOString(),
        endTs: apt.endTs || new Date().toISOString(),
        status: apt.status || 'HOLD'
      }));
      
      return {
        success: result.success,
        data: appointments,
        count: result.count || appointments.length
      };
    },
    onError: (error) => {
      console.error('Appointments fetch error:', error);
      showError(error.message || 'Failed to fetch appointments');
    },
    staleTime: 300000, // 5 minutes
    refetchInterval: false, // Disable auto-refetch
    enabled: !!date,
  });
};

// Start consultation
export const useStartConsultation = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (appointmentId) => startConsultation(appointmentId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      showSuccess('Consultation started successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to start consultation');
    },
  });
};

// End consultation
export const useEndConsultation = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (appointmentId) => endConsultation(appointmentId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      showSuccess('Consultation ended successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to end consultation');
    },
  });
};

// Get patient context for appointment
export const usePatientContext = (appointmentId) => {
  const { showError } = useToast();

  return useQuery({
    queryKey: ['patientContext', appointmentId],
    queryFn: () => getPatientContext(appointmentId),
    onError: (error) => {
      showError(error.message || 'Failed to fetch patient context');
    },
    enabled: !!appointmentId,
  });
};


