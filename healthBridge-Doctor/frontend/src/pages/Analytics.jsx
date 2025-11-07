import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, Star, Calendar } from 'lucide-react';
import { getAnalytics } from '../api/doctorApi';
import SkeletonLoader from '../components/SkeletonLoader';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'year'

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Calculate date range based on selection
      const endDate = new Date();
      const startDate = new Date();
      
      if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === 'month') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (dateRange === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      // Call real backend API
      const response = await getAnalytics(startDate.toISOString(), endDate.toISOString());
      
      if (response.success) {
        // Transform backend data to frontend format
        const backendStats = response.data.stats;
        
        setAnalyticsData({
          overview: {
            totalAppointments: backendStats.totalAppointments || 0,
            completedAppointments: backendStats.completed || 0,
            cancelledAppointments: backendStats.cancelled || 0,
            noShows: backendStats.noShows || 0,
            avgConsultTime: backendStats.avgConsultTime || 0,
            totalRevenue: backendStats.revenue || 0,
            avgRating: 4.7, // Mock for now
          },
          // Mock chart data - backend could provide this in future
          consultationTrends: generateMockTrends(backendStats),
          statusDistribution: [
            { status: 'Completed', count: backendStats.completed || 0, percentage: Math.round((backendStats.completed / backendStats.totalAppointments) * 100) || 0 },
            { status: 'Cancelled', count: backendStats.cancelled || 0, percentage: Math.round((backendStats.cancelled / backendStats.totalAppointments) * 100) || 0 },
            { status: 'No Show', count: backendStats.noShows || 0, percentage: Math.round((backendStats.noShows / backendStats.totalAppointments) * 100) || 0 },
          ],
          revenueByMonth: generateMockRevenue(backendStats.revenue),
          topDiagnoses: [
            { diagnosis: 'Hypertension', count: 45 },
            { diagnosis: 'Type 2 Diabetes', count: 38 },
            { diagnosis: 'Coronary Artery Disease', count: 22 },
            { diagnosis: 'Arrhythmia', count: 18 },
            { diagnosis: 'Heart Failure', count: 12 },
          ],
          patientDemographics: {
            ageGroups: [
              { group: '0-18', count: 5 },
              { group: '19-35', count: 28 },
              { group: '36-50', count: 52 },
              { group: '51-65', count: 48 },
              { group: '65+', count: 23 },
            ],
            genderDistribution: [
              { gender: 'Male', count: 89 },
              { gender: 'Female', count: 67 },
            ],
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to generate mock trend data from backend stats
  const generateMockTrends = (stats) => {
    const days = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365;
    const avgPerDay = Math.ceil((stats.totalAppointments || 0) / days);
    
    return Array.from({ length: Math.min(days, 7) }, (_, i) => ({
      date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString(),
      count: avgPerDay + Math.floor(Math.random() * 5),
      duration: stats.avgConsultTime || 24,
    }));
  };

  // Helper function to generate mock revenue data
  const generateMockRevenue = (totalRevenue) => {
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const avgRevenue = Math.ceil(totalRevenue / 6);
    
    return months.map(month => ({
      month,
      revenue: avgRevenue + Math.floor(Math.random() * avgRevenue * 0.2),
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="title" className="w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <SkeletonLoader key={i} variant="card" />
          ))}
        </div>
        <SkeletonLoader variant="card" className="h-96" />
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Appointments',
      value: analyticsData?.overview.totalAppointments,
      icon: Calendar,
      color: 'bg-blue-100 text-blue-600',
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Completion Rate',
      value: `${Math.round((analyticsData?.overview.completedAppointments / analyticsData?.overview.totalAppointments) * 100)}%`,
      icon: Users,
      color: 'bg-green-100 text-green-600',
      trend: '+5%',
      trendUp: true,
    },
    {
      label: 'Avg. Consult Time',
      value: `${analyticsData?.overview.avgConsultTime} min`,
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600',
      trend: '-3 min',
      trendUp: false,
    },
    {
      label: 'Total Revenue',
      value: `₹${analyticsData?.overview.totalRevenue?.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-100 text-purple-600',
      trend: '+15%',
      trendUp: true,
    },
  ];

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Performance insights and trends</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2">
          {['week', 'month', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1">
                  {stat.trendUp ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      stat.trendUp ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stat.trend}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consultation Trends */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultation Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData?.consultationTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
                name="Appointments"
              />
              <Line
                type="monotone"
                dataKey="duration"
                stroke="#10b981"
                strokeWidth={2}
                name="Avg Duration (min)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData?.statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percentage }) => `${status} (${percentage}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {analyticsData?.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData?.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Diagnoses */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Diagnoses</h3>
          <div className="space-y-3">
            {analyticsData?.topDiagnoses.map((item, index) => {
              const maxCount = analyticsData.topDiagnoses[0].count;
              const percentage = (item.count / maxCount) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{item.diagnosis}</span>
                    <span className="text-sm text-gray-600">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Patient Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analyticsData?.patientDemographics.ageGroups}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="group" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Summary */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Patient Satisfaction</div>
                <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {analyticsData?.overview.avgRating}
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                </div>
              </div>
              <div className="text-sm text-green-600 font-medium">Excellent</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">No-Show Rate</div>
                <div className="text-xl font-bold text-gray-900">
                  {Math.round((analyticsData?.overview.noShows / analyticsData?.overview.totalAppointments) * 100)}%
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Cancellation Rate</div>
                <div className="text-xl font-bold text-gray-900">
                  {Math.round((analyticsData?.overview.cancelledAppointments / analyticsData?.overview.totalAppointments) * 100)}%
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Key Insights</span>
              </div>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Consultation efficiency improved by 15%</li>
                <li>• Patient retention rate at 94%</li>
                <li>• Average wait time reduced to 12 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

