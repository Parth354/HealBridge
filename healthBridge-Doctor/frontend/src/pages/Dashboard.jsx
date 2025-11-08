import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp,
  Activity,
  DollarSign,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useAppointments } from '../hooks/useAppointments';
import { getStatistics, getDoctorStatus, getSchedule } from '../api/doctorApi';
import AppointmentCard from '../components/AppointmentCard';
import { AppointmentCardSkeleton } from '../components/SkeletonLoader';
import { format } from 'date-fns';
import { useToast } from '../context/ToastContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statistics, setStatistics] = useState(null);
  const [doctorStatus, setDoctorStatus] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentSlots, setRecentSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  const { data: appointmentsData, isLoading } = useAppointments(selectedDate);

  // Fetch statistics from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        // Get last 30 days statistics
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        const [statsResponse, statusResponse] = await Promise.all([
          getStatistics(startDate.toISOString(), endDate.toISOString()),
          getDoctorStatus()
        ]);
        
        if (statsResponse.success) {
          setStatistics(statsResponse.data);
        }
        if (statusResponse.success) {
          setDoctorStatus(statusResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
        showError('Failed to load dashboard statistics');
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [showError]);

  // Fetch recent schedule slots
  useEffect(() => {
    const fetchRecentSlots = async () => {
      try {
        setSlotsLoading(true);
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const response = await getSchedule(
          today.toISOString().split('T')[0],
          nextWeek.toISOString().split('T')[0]
        );
        
        if (response && response.scheduleBlocks) {
          // Get only work slots and limit to 5 most recent
          const workSlots = response.scheduleBlocks
            .filter(sb => sb.type === 'work')
            .sort((a, b) => new Date(a.startTs) - new Date(b.startTs))
            .slice(0, 5);
          setRecentSlots(workSlots);
        }
      } catch (error) {
        console.error('Failed to fetch schedule slots:', error);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchRecentSlots();
  }, []);

  const stats = [
    {
      label: 'Today\'s Appointments',
      value: appointmentsData?.count || 0,
      icon: Calendar,
      color: 'bg-blue-100 text-blue-600',
      trend: appointmentsData?.count > 0 ? `${appointmentsData.count} today` : 'No appointments',
    },
    {
      label: 'Total Appointments',
      value: statistics?.stats?.totalAppointments || 0,
      icon: Users,
      color: 'bg-green-100 text-green-600',
      trend: `Last 30 days`,
    },
    {
      label: 'Avg. Consult Time',
      value: `${statistics?.stats?.avgConsultTime || 0} min`,
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600',
      trend: statistics?.stats?.avgConsultTime ? 'Average' : 'No data',
    },
    {
      label: 'Revenue',
      value: `₹${statistics?.stats?.revenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'bg-purple-100 text-purple-600',
      trend: 'Last 30 days',
    },
  ];

  const quickActions = [
    {
      label: 'View Schedule',
      description: 'Check all appointments',
      icon: Calendar,
      color: 'bg-blue-600',
      action: () => navigate('/schedule'),
    },
    {
      label: 'Add Time Slot',
      description: 'Open new slots',
      icon: Clock,
      color: 'bg-green-600',
      action: () => navigate('/schedule?action=add'),
    },
    {
      label: 'Analytics',
      description: 'View reports',
      icon: Activity,
      color: 'bg-purple-600',
      action: () => navigate('/analytics'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <button
          onClick={() => navigate('/schedule')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          View Full Schedule
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  {statsLoading ? (
                    <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">{stat.trend}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="bg-white rounded-lg shadow border border-gray-200 p-6 text-left hover:shadow-md transition-all hover:scale-105 group"
              >
                <div className="flex items-start gap-4">
                  <div className={`${action.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{action.label}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Schedule Slots */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Schedule Slots</h2>
          <button
            onClick={() => navigate('/schedule')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {slotsLoading ? (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : recentSlots.length > 0 ? (
          <div className="space-y-3 mb-6">
            {recentSlots.map((slot) => {
              const startTime = new Date(slot.startTs);
              const endTime = new Date(slot.endTs);
              return (
                <div
                  key={slot.id}
                  className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {format(startTime, 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Duration: {slot.slotMinutes} min
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/schedule')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No schedule slots</h3>
            <p className="text-gray-600 mb-6">Create schedule slots to allow patients to book appointments.</p>
            <button
              onClick={() => navigate('/schedule')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Create Slots
            </button>
          </div>
        )}
      </div>

      {/* Today's Appointments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Today's Appointments</h2>
          <button
            onClick={() => navigate('/schedule')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow border border-gray-200 p-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : appointmentsData?.data?.length > 0 ? (
          <div className="space-y-4">
            {appointmentsData.data.slice(0, 3).map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments today</h3>
            <p className="text-gray-600 mb-6">Your schedule is clear for today.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/schedule')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Add Time Slots
              </button>
              <button
                onClick={() => navigate('/schedule')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                View Schedule
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Satisfaction */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Patient Satisfaction</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-gray-900">4.7</span>
            <span className="text-gray-600 mb-2">/ 5.0</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">Based on 142 reviews this month</p>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-12">{stars} stars</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{ width: `${stars === 5 ? 75 : stars === 4 ? 20 : 5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts & Reminders */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Alerts & Reminders</h3>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-medium text-orange-900 mb-1">
                3 patients waiting
              </p>
              <p className="text-xs text-orange-700">
                Average wait time: 15 minutes
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Prescription pending approval
              </p>
              <p className="text-xs text-blue-700">
                2 prescriptions need your review
              </p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-1">
                System update available
              </p>
              <p className="text-xs text-green-700">
                New features and improvements
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

