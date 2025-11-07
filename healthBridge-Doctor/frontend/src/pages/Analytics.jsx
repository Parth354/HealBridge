/**
 * Analytics Dashboard - Comprehensive Business Intelligence
 * 
 * Features:
 * - KPI cards (appointments, revenue, ratings)
 * - Interactive charts (line, bar, pie)
 * - Date range filtering
 * - Data export (CSV, PDF, Excel)
 * - Real-time metrics
 * - Comparative analysis
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Download, Calendar, TrendingUp, Users, DollarSign, 
  Star, Filter, RefreshCw, FileText
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';

const Analytics = () => {
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(subMonths(new Date(), 2)),
    end: endOfMonth(new Date())
  });
  const [selectedMetric, setSelectedMetric] = useState('appointments');

  // Fetch analytics data
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: async () => {
      const response = await api.get('/api/analytics/overview', {
        params: {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString()
        }
      });
      return response.data;
    }
  });

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Export functions
  const exportToCSV = () => {
    if (!analytics) {
      alert('No analytics data available to export');
      return;
    }

    const rows = [
      ['Analytics Report'],
      [`Date Range: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`],
      [''],
      ['=== KEY METRICS ==='],
      ['Metric', 'Value'],
      ['Total Appointments', analytics.appointments?.total || 0],
      ['Completed Appointments', analytics.appointments?.completed || 0],
      ['Cancelled Appointments', analytics.appointments?.cancelled || 0],
      ['Completion Rate', `${analytics.appointments?.completionRate || 0}%`],
      ['Total Revenue', `₹${(analytics.revenue?.total || 0).toLocaleString()}`],
      ['Average Revenue per Appointment', `₹${analytics.revenue?.averagePerAppointment || 0}`],
      ['Average Rating', `${analytics.performance?.avgRating || 0}/5`],
      [''],
      ['=== APPOINTMENT TRENDS (Daily) ==='],
      ['Date', 'Appointments']
    ];

    // Add daily appointment data
    if (analytics.appointmentsByDay) {
      Object.entries(analytics.appointmentsByDay).forEach(([date, count]) => {
        rows.push([format(new Date(date), 'MMM dd, yyyy'), count]);
      });
    }

    rows.push(['']);
    rows.push(['=== REVENUE BY CLINIC ===']);
    rows.push(['Clinic', 'Revenue (₹)']);
    
    // Add revenue by clinic data
    if (analytics.revenueByClinic) {
      Object.entries(analytics.revenueByClinic).forEach(([clinic, revenue]) => {
        rows.push([clinic, revenue.toLocaleString()]);
      });
    }

    rows.push(['']);
    rows.push(['=== VISIT TYPE BREAKDOWN ===']);
    rows.push(['Type', 'Count']);
    
    // Add visit type data
    if (analytics.byVisitType) {
      Object.entries(analytics.byVisitType).forEach(([type, count]) => {
        rows.push([type, count]);
      });
    }

    rows.push(['']);
    rows.push(['=== PEAK HOURS ===']);
    rows.push(['Hour', 'Appointments']);
    
    // Add peak hours data
    if (analytics.byHour) {
      analytics.byHour.forEach((count, hour) => {
        if (count > 0) {
          rows.push([`${hour}:00`, count]);
        }
      });
    }

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!analytics) {
      alert('No analytics data available to export');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text('Analytics Report', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(
      `Date Range: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;

    // KPI Summary Table
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Key Performance Indicators', 14, yPos);
    yPos += 5;

    doc.autoTable({
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Appointments', `${analytics.appointments?.total || 0}`],
        ['Completed Appointments', `${analytics.appointments?.completed || 0}`],
        ['Cancelled Appointments', `${analytics.appointments?.cancelled || 0}`],
        ['Completion Rate', `${analytics.appointments?.completionRate || 0}%`],
        ['Total Revenue', `₹${(analytics.revenue?.total || 0).toLocaleString()}`],
        ['Avg Revenue/Appointment', `₹${analytics.revenue?.averagePerAppointment || 0}`],
        ['Average Rating', `${analytics.performance?.avgRating || 0}/5`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 }, // Blue-600
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 'auto', halign: 'right' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Appointment Trends
    if (analytics.appointmentsByDay && Object.keys(analytics.appointmentsByDay).length > 0) {
      doc.setFontSize(14);
      doc.text('Appointment Trends (Daily)', 14, yPos);
      yPos += 5;

      const trendData = Object.entries(analytics.appointmentsByDay)
        .map(([date, count]) => [format(new Date(date), 'MMM dd, yyyy'), count])
        .slice(0, 10); // Limit to 10 most recent days

      doc.autoTable({
        startY: yPos,
        head: [['Date', 'Appointments']],
        body: trendData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }, // Green-500
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 'auto', halign: 'right' }
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Revenue by Clinic
    if (analytics.revenueByClinic && Object.keys(analytics.revenueByClinic).length > 0) {
      doc.setFontSize(14);
      doc.text('Revenue by Clinic', 14, yPos);
      yPos += 5;

      const revenueData = Object.entries(analytics.revenueByClinic)
        .map(([clinic, revenue]) => [clinic, `₹${revenue.toLocaleString()}`]);

      doc.autoTable({
        startY: yPos,
        head: [['Clinic', 'Revenue']],
        body: revenueData,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] }, // Amber-500
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 'auto', halign: 'right' }
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Visit Type Breakdown
    if (analytics.byVisitType && Object.keys(analytics.byVisitType).length > 0) {
      doc.setFontSize(14);
      doc.text('Visit Type Breakdown', 14, yPos);
      yPos += 5;

      const visitTypeData = Object.entries(analytics.byVisitType)
        .map(([type, count]) => [type, count]);

      doc.autoTable({
        startY: yPos,
        head: [['Visit Type', 'Count']],
        body: visitTypeData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] }, // Purple-500
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 'auto', halign: 'right' }
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Peak Hours
    if (analytics.byHour) {
      doc.setFontSize(14);
      doc.text('Peak Hours', 14, yPos);
      yPos += 5;

      const peakHoursData = analytics.byHour
        .map((count, hour) => [`${hour}:00`, count])
        .filter(([_, count]) => count > 0);

      if (peakHoursData.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['Hour', 'Appointments']],
          body: peakHoursData,
          theme: 'grid',
          headStyles: { fillColor: [239, 68, 68] }, // Red-500
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 'auto', halign: 'right' }
          }
        });
      }
    }

    // Footer on each page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175); // Gray-400
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        'HealBridge Doctor Analytics',
        14,
        pageHeight - 10
      );
    }

    // Save the PDF
    doc.save(`analytics-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
  };

  // Prepare chart data
  const appointmentTrendData = useMemo(() => {
    if (!analytics?.appointmentsByDay) return [];
    
    return Object.entries(analytics.appointmentsByDay).map(([date, count]) => ({
      date: format(new Date(date), 'MMM dd'),
      appointments: count
    }));
  }, [analytics]);

  const revenueByClinicData = useMemo(() => {
    if (!analytics?.revenueByClinic) return [];
    
    return Object.entries(analytics.revenueByClinic).map(([clinic, revenue]) => ({
      clinic,
      revenue
    }));
  }, [analytics]);

  const visitTypeData = useMemo(() => {
    if (!analytics?.byVisitType) return [];
    
    return Object.entries(analytics.byVisitType).map(([type, count]) => ({
      name: type,
      value: count
    }));
  }, [analytics]);

  const peakHoursData = useMemo(() => {
    if (!analytics?.byHour) return [];
    
    return analytics.byHour.map((count, hour) => ({
      hour: `${hour}:00`,
      appointments: count
    }));
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive view of your practice metrics</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-600" />
            <input
              type="date"
              value={format(dateRange.start, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
              className="px-3 py-2 border rounded"
            />
            <span className="text-gray-600">to</span>
            <input
              type="date"
              value={format(dateRange.end, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
              className="px-3 py-2 border rounded"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
            >
              <FileText size={16} />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Total Appointments</div>
            <Users className="text-blue-600" size={24} />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {analytics?.appointments?.total || 0}
          </div>
          <div className="text-sm text-green-600 mt-2">
            +{analytics?.appointments?.completed || 0} completed
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <DollarSign className="text-green-600" size={24} />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            ₹{(analytics?.revenue?.total || 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Avg: ₹{analytics?.revenue?.averagePerAppointment || 0}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Completion Rate</div>
            <TrendingUp className="text-purple-600" size={24} />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {analytics?.appointments?.completionRate || 0}%
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Target: 90%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Average Rating</div>
            <Star className="text-yellow-600" size={24} />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {analytics?.performance?.avgRating || 0}
            <span className="text-xl text-gray-600">/5</span>
          </div>
          <div className="flex mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                className={star <= (analytics?.performance?.avgRating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Appointment Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointment Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={appointmentTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="appointments" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Clinic */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Clinic</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByClinicData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="clinic" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Visit Types Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Visit Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={visitTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {visitTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Peak Hours</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={peakHoursData.filter(d => d.appointments > 0)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="appointments" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Doctors Table */}
      {analytics?.topDoctors && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Doctors</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-gray-600">Rank</th>
                  <th className="text-left py-3 px-4 text-gray-600">Doctor</th>
                  <th className="text-left py-3 px-4 text-gray-600">Specialties</th>
                  <th className="text-left py-3 px-4 text-gray-600">Appointments</th>
                  <th className="text-left py-3 px-4 text-gray-600">Rating</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topDoctors.map((doctor, index) => (
                  <tr key={doctor.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-800">#{index + 1}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">{doctor.name}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {doctor.specialties.join(', ')}
                    </td>
                    <td className="py-3 px-4 text-gray-800">{doctor.appointmentCount}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        <span className="font-medium text-gray-800">{doctor.rating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
