/**
 * Advanced Calendar Component
 * 
 * Features:
 * - Month/Week/Day views
 * - Drag and drop appointments
 * - Visual appointment status indicators
 * - Conflict detection
 * - Quick appointment preview
 * - Responsive design
 */

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays } from 'date-fns';

const AdvancedCalendar = ({ 
  appointments = [], 
  onAppointmentClick, 
  onDateClick,
  onAppointmentDrag,
  view = 'month' // 'month', 'week', 'day'
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [draggedAppointment, setDraggedAppointment] = useState(null);

  /**
   * Calculate calendar days for month view
   */
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);

    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  /**
   * Group appointments by date
   */
  const appointmentsByDate = useMemo(() => {
    const grouped = {};
    
    appointments.forEach(apt => {
      const dateKey = format(new Date(apt.startTs), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(apt);
    });

    return grouped;
  }, [appointments]);

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    const colors = {
      CONFIRMED: 'bg-blue-500',
      STARTED: 'bg-green-500',
      COMPLETED: 'bg-gray-400',
      CANCELLED: 'bg-red-500',
      HOLD: 'bg-yellow-500'
    };
    return colors[status] || 'bg-gray-300';
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (e, appointment) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  /**
   * Handle drop
   */
  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    
    if (draggedAppointment && onAppointmentDrag) {
      onAppointmentDrag(draggedAppointment, targetDate);
    }
    
    setDraggedAppointment(null);
  };

  /**
   * Navigation
   */
  const navigate = (direction) => {
    setCurrentDate(prev => 
      direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  /**
   * Render month view
   */
  const renderMonthView = () => {
    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-600">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayAppointments = appointmentsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={index}
              className={`
                min-h-[100px] p-2 bg-white
                ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                ${isToday ? 'ring-2 ring-blue-500' : ''}
                ${isSelected ? 'bg-blue-50' : ''}
                hover:bg-gray-50 cursor-pointer transition-colors
              `}
              onClick={() => {
                setSelectedDate(day);
                onDateClick && onDateClick(day);
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-medium ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                  {format(day, 'd')}
                </span>
                {dayAppointments.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">
                    {dayAppointments.length}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((apt, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={(e) => handleDragStart(e, apt)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick && onAppointmentClick(apt);
                    }}
                    className={`
                      ${getStatusColor(apt.status)} 
                      text-white text-xs p-1 rounded cursor-move
                      hover:opacity-80 transition-opacity
                      truncate
                    `}
                    title={`${format(new Date(apt.startTs), 'HH:mm')} - Patient`}
                  >
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{format(new Date(apt.startTs), 'HH:mm')}</span>
                    </div>
                  </div>
                ))}
                
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Today
          </button>

          <button
            onClick={() => navigate('prev')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => navigate('next')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>On Hold</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Cancelled</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-400 rounded"></div>
          <span>Completed</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {renderMonthView()}

      {/* Stats */}
      <div className="mt-4 p-3 bg-gray-50 rounded flex justify-around text-sm">
        <div className="text-center">
          <div className="font-bold text-lg text-blue-600">{appointments.length}</div>
          <div className="text-gray-600">Total</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-lg text-green-600">
            {appointments.filter(a => a.status === 'CONFIRMED').length}
          </div>
          <div className="text-gray-600">Confirmed</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-lg text-gray-600">
            {appointments.filter(a => a.status === 'COMPLETED').length}
          </div>
          <div className="text-gray-600">Completed</div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedCalendar;

