import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { analyticsAPI, attendanceAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import {
  Users, Route, Building2, BarChart3, Clock, CheckCircle2, XCircle,
  CalendarDays, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

const StatCard = ({ label, value, icon: Icon, color = 'primary', sub }) => {
  const colorMap = {
    primary: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="stat-card">
      <div className={`p-2.5 rounded-lg w-fit ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <p className="stat-value mt-3">{value ?? '—'}</p>
      <p className="stat-label">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
};

export default function GuestDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: analyticsAPI.getDashboard,
  });
  const { data: routeStats = [], isLoading: routesLoading } = useQuery({
    queryKey: ['route-stats'],
    queryFn: analyticsAPI.getRoutes,
  });
  const { data: revenue } = useQuery({
    queryKey: ['revenue'],
    queryFn: analyticsAPI.getRevenue,
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ['all-attendance'],
    queryFn: () => attendanceAPI.getAll({ limit: 200 }),
  });

  const statusPieData = stats ? [
    { name: 'Confirmed', value: stats.approvedFinal },
    { name: 'Pending Coordinator', value: stats.pendingCoordinator },
    { name: 'Pending Accounts', value: stats.pendingAccounts },
    { name: 'Rejected', value: (stats.rejectedL1 || 0) + (stats.rejectedL2 || 0) },
  ].filter(d => d.value > 0) : [];

  const revenueBarData = Array.isArray(revenue)
    ? revenue.slice(0, 8).map(r => ({ name: r.routeName?.split(' ')[0] || r.routeName, revenue: r.revenue }))
    : [];

  const totalAttendance = attendance.length;
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null;

  return (
    <Layout title="Guest Overview">
      <div className="space-y-6">
        {statsLoading ? <LoadingSpinner /> : (
          <>
            {/* Banner */}
            <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <BarChart3 size={20} className="text-indigo-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-indigo-800">Guest View — Read Only</p>
                <p className="text-xs text-indigo-600">You have view-only access to all transport data. No changes can be made.</p>
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Students Enrolled" value={stats?.approvedFinal} icon={Users} color="green" />
              <StatCard label="Total Revenue" value={formatCurrency(stats?.totalRevenue)} icon={TrendingUp} color="primary" />
              <StatCard label="Bus Routes" value={stats?.totalRoutes} icon={Route} color="purple" />
              <StatCard label="Colleges" value={stats?.totalColleges} icon={Building2} color="indigo" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Applications" value={stats?.totalApplications} icon={BarChart3} color="primary" />
              <StatCard label="Pending Coordinator" value={stats?.pendingCoordinator} icon={Clock} color="yellow" />
              <StatCard label="Pending Accounts" value={stats?.pendingAccounts} icon={Clock} color="yellow" />
              <StatCard
                label="Attendance Rate"
                value={attendanceRate != null ? `${attendanceRate}%` : '—'}
                icon={CalendarDays}
                color="green"
                sub={totalAttendance > 0 ? `${presentCount} / ${totalAttendance} records` : null}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Application status pie */}
              {statusPieData.length > 0 && (
                <div className="card">
                  <h2 className="mb-4">Application Status</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {statusPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [v, 'Count']} />
                      <Legend iconType="circle" iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Revenue by route bar */}
              {revenueBarData.length > 0 && (
                <div className="card">
                  <h2 className="mb-4">Revenue by Route</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={revenueBarData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => [formatCurrency(v), 'Revenue']} />
                      <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Route occupancy */}
            {!routesLoading && routeStats.length > 0 && (
              <div className="card">
                <h2 className="mb-4">Route Occupancy</h2>
                <div className="space-y-3">
                  {routeStats.map(route => (
                    <div key={route.routeId} className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{route.routeName}</p>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {route.occupiedSeats}/{route.seatCapacity} seats
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${route.occupancyRate >= 90 ? 'bg-red-500' : route.occupancyRate >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${route.occupancyRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 w-24">
                        <span className={`text-sm font-semibold ${route.occupancyRate >= 90 ? 'text-red-600' : route.occupancyRate >= 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {route.occupancyRate}%
                        </span>
                        <p className="text-xs text-gray-400">{formatCurrency(route.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
