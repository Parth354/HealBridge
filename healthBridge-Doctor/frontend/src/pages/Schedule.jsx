import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Pause, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { useAppointments, useStartConsultation } from '../hooks/useAppointments';
import { markUnavailable, createSchedule, createRecurringSchedule, getClinics } from '../api/doctorApi';
import AppointmentCard from '../components/AppointmentCard';
import { AppointmentCardSkeleton } from '../components/SkeletonLoader';
import { APPOINTMENT_STATUS } from '../utils/constants';
import { useToast } from '../context/ToastContext';

const Schedule = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [clinics, setClinics] = useState([]);
  const { showSuccess, showError } = useToast();
  
  // Add Slot Form State
  const [slotForm, setSlotForm] = useState({
    clinic_id: '',
    date: '',
    start_time: '',
    end_time: '',
    slot_duration_minutes: 30,
    is_house_visit: false,
    is_recurring: false,
    recurrence_type: 'WEEKLY',
    recurrence_end_date: ''
  });

  const { data: appointmentsData, isLoading, refetch } = useAppointments(
    selectedDate.toISOString().split('T')[0]
  );

  const startConsultation = useStartConsultation();

  // Fetch clinics on mount
  useEffect(() => {
    fetchClinics();
  }, []);

  // Set default date when modal opens
  useEffect(() => {
    if (showAddSlotModal && !slotForm.date) {
      setSlotForm(prev => ({
        ...prev,
        date: selectedDate.toISOString().split('T')[0]
      }));
    }
  }, [showAddSlotModal, selectedDate]);

  const fetchClinics = async () => {
    try {
      const response = await getClinics();
      console.log('Clinics response:', response); // Debug log
      
      if (response.success && response.data) {
        setClinics(response.data);
        // Set first clinic as default
        if (response.data.length > 0) {
          setSlotForm(prev => ({ ...prev, clinic_id: response.data[0].id }));
        }
      } else {
        console.warn('No clinics data in response:', response);
        setClinics([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error('Failed to fetch clinics:', error);
      setClinics([]); // Set empty array on error
      showError('Failed to load clinics. Please try refreshing the page.');
    }
  };

  const handleDateChange = (direction) => {
    const days = viewMode === 'day' ? 1 : 7;
    setSelectedDate(prev => 
      direction === 'next' ? addDays(prev, days) : addDays(prev, -days)
    );
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleAppointmentAction = async (action, appointmentId) => {
    if (action === 'start' || action === 'confirm') {
      startConsultation.mutate(appointmentId);
    } else if (action === 'cancel') {
      // Backend would need a cancel endpoint, for now show message
      showSuccess('Cancel functionality - contact backend team to add cancel endpoint');
    }
  };

  const handleMarkLeave = async () => {
    try {
      const startTs = new Date(selectedDate);
      startTs.setHours(0, 0, 0, 0);
      const endTs = new Date(selectedDate);
      endTs.setHours(23, 59, 59, 999);
      
      await markUnavailable(startTs.toISOString(), endTs.toISOString(), 'HOLIDAY');
      showSuccess('Leave marked successfully');
      refetch();
    } catch (error) {
      if (error.message.includes('Unique constraint')) {
        showError('Schedule already exists for this time slot');
      } else {
        showError(error.message || 'Failed to mark leave');
      }
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!slotForm.clinic_id || !slotForm.date || !slotForm.start_time || !slotForm.end_time) {
      showError('Please fill in all required fields');
      return;
    }

    // Validate time range
    if (slotForm.start_time >= slotForm.end_time) {
      showError('End time must be after start time');
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(slotForm.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      showError('Cannot create schedule for past dates');
      return;
    }

    try {
      setIsAddingSlot(true);

      if (slotForm.is_recurring) {
        // Create recurring schedule - Backend expects weekPattern format
        const startDate = new Date(slotForm.date);
        const endDate = slotForm.recurrence_end_date 
          ? new Date(slotForm.recurrence_end_date)
          : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // Default: 1 year from start
        
        const recurringData = {
          clinicId: slotForm.clinic_id,
          weekPattern: [{
            day: startDate.getDay(), // 0-6 (Sunday-Saturday)
            startTime: slotForm.start_time,
            endTime: slotForm.end_time
          }],
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          slotMinutes: parseInt(slotForm.slot_duration_minutes),
          bufferMinutes: 0
        };

        await createRecurringSchedule(recurringData);
        showSuccess('Recurring schedule created successfully!');
      } else {
        // Create one-time schedule
        // Construct proper Date objects for ISO timestamps
        const startDate = new Date(`${slotForm.date}T${slotForm.start_time}:00`);
        const endDate = new Date(`${slotForm.date}T${slotForm.end_time}:00`);
        
        const scheduleData = {
          clinicId: slotForm.clinic_id,
          startTs: startDate.toISOString(),
          endTs: endDate.toISOString(),
          slotMinutes: parseInt(slotForm.slot_duration_minutes),
          bufferMinutes: 0,
          type: 'work'
        };
        
        console.log('Sending schedule data:', scheduleData);

        await createSchedule(scheduleData);
        showSuccess('Schedule slot created successfully!');
      }

      // Reset form and close modal
      setSlotForm({
        clinic_id: clinics[0]?.id || '',
        date: '',
        start_time: '',
        end_time: '',
        slot_duration_minutes: 30,
        is_house_visit: false,
        is_recurring: false,
        recurrence_type: 'WEEKLY',
        recurrence_end_date: ''
      });
      setShowAddSlotModal(false);
      refetch();
    } catch (error) {
      if (error.message.includes('Unique constraint')) {
        showError('Schedule already exists for this time slot. Please choose a different time.');
      } else {
        showError(error.message || 'Failed to create schedule slot');
      }
    } finally {
      setIsAddingSlot(false);
    }
  };

  const handleOpenAddSlot = async () => {
    // Refresh clinics before opening modal
    await fetchClinics();
    
    // Set default date to selected date
    setSlotForm(prev => ({
      ...prev,
      date: selectedDate.toISOString().split('T')[0]
    }));
    setShowAddSlotModal(true);
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // Filter appointments on frontend based on status
  const filteredAppointments = filterStatus === 'all' 
    ? appointmentsData?.data 
    : appointmentsData?.data?.filter(apt => apt.status === filterStatus);

  const statusFilters = [
    { label: 'All', value: 'all' },
    { label: 'Hold', value: 'HOLD' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Started', value: 'STARTED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  return (
    <>
      {/* Add Slot Modal */}
      {showAddSlotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Add Schedule Slot</h2>
              <button
                onClick={() => setShowAddSlotModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddSlot} className="p-6 space-y-6">
              {/* Clinic Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic * <span className="text-gray-500 font-normal">({clinics.length} clinics)</span>
                </label>
                <select
                  value={slotForm.clinic_id}
                  onChange={(e) => setSlotForm({ ...slotForm, clinic_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={clinics.length === 0}
                >
                  <option value="">Select a clinic</option>
                  {clinics.map(clinic => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name} - {clinic.address}
                    </option>
                  ))}
                </select>
                {clinics.length === 0 ? (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      No clinics found. You need to add a clinic before creating schedules.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSlotModal(false);
                        window.location.href = '/settings';
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                    >
                      Go to Settings → Add Clinic
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {clinics.length} clinic(s) available
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={slotForm.date}
                  onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={slotForm.start_time}
                    onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={slotForm.end_time}
                    onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Slot Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slot Duration (minutes) *
                </label>
                <select
                  value={slotForm.slot_duration_minutes}
                  onChange={(e) => setSlotForm({ ...slotForm, slot_duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Time allocated per patient appointment
                </p>
              </div>

              {/* House Visit Option */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="house_visit"
                  checked={slotForm.is_house_visit}
                  onChange={(e) => setSlotForm({ ...slotForm, is_house_visit: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="house_visit" className="text-sm font-medium text-gray-700">
                  Available for house visits
                </label>
              </div>

              {/* Recurring Option */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={slotForm.is_recurring}
                    onChange={(e) => setSlotForm({ ...slotForm, is_recurring: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
                    Make this a recurring schedule
                  </label>
                </div>

                {slotForm.is_recurring && (
                  <div className="space-y-4 ml-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recurrence Type
                      </label>
                      <select
                        value={slotForm.recurrence_type}
                        onChange={(e) => setSlotForm({ ...slotForm, recurrence_type: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Bi-weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date (optional)
                      </label>
                      <input
                        type="date"
                        value={slotForm.recurrence_end_date}
                        onChange={(e) => setSlotForm({ ...slotForm, recurrence_end_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min={slotForm.date}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Leave empty for indefinite recurrence
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingSlot || clinics.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {isAddingSlot ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-600 mt-1">
            Manage your appointments and availability
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            onClick={handleOpenAddSlot}
          >
            <Plus className="w-4 h-4" />
            Add Slot
          </button>
          <button
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            onClick={handleMarkLeave}
          >
            <Pause className="w-4 h-4" />
            Mark Leave
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDateChange('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 min-w-[200px] justify-center">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">
                {viewMode === 'day' 
                  ? format(selectedDate, 'MMMM d, yyyy')
                  : `Week of ${format(startOfWeek(selectedDate), 'MMM d, yyyy')}`
                }
              </span>
            </div>
            <button
              onClick={() => handleDateChange('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleToday}
              className="ml-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Today
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week View
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">Filter:</span>
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {viewMode === 'day' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredAppointments?.length || 0} Appointment{filteredAppointments?.length !== 1 ? 's' : ''}
            </h2>
            {filteredAppointments?.length > 0 && (
              <div className="text-sm text-gray-600">
                Estimated time: {(filteredAppointments?.length * 25) || 0} minutes
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <AppointmentCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAppointments?.length > 0 ? (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment}
                  onAction={handleAppointmentAction}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <CalendarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No appointments found
              </h3>
              <p className="text-gray-600">
                {filterStatus === 'all' 
                  ? 'You don\'t have any appointments scheduled for this day.'
                  : `No appointments with status "${filterStatus}" for this day.`
                }
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Week View */
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {getWeekDays().map((day, index) => {
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <div key={index} className="bg-white p-4">
                  <div className={`text-center mb-3 pb-2 border-b ${isToday ? 'border-blue-600' : 'border-gray-200'}`}>
                    <div className="text-xs text-gray-500 uppercase">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-xl font-bold mt-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {/* Mock appointments for week view */}
                    {[1, 2].map((i) => (
                      <div key={i} className="p-2 bg-blue-50 rounded text-xs">
                        <div className="font-medium text-gray-900">Patient {i}</div>
                        <div className="text-gray-600">{9 + i}:00 AM</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Schedule;

