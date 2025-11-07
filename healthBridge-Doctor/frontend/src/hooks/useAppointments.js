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
    queryFn: () => getAppointments(date),
    onError: (error) => {
      showError(error.message || 'Failed to fetch appointments');
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
    enabled: !!date, // Only fetch if date is provided
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


