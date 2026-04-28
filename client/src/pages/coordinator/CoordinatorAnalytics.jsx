import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { analyticsAPI } from '../../utils/api';
import { formatCurrency, exportToPDF, exportToCSV, getOccupancyColor } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export default function CoordinatorAnalytics() {
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: analyticsAPI.getDashboard });
  const { data: routeStats = [], isLoading } = useQuery({ queryKey: ['route-stats'], queryFn: analyticsAPI.getRoutes });
  const { data: revenue } = useQuery({ queryKey: ['revenue'], queryFn: analyticsAPI.getRevenue });

  const statusPieData = stats ? [
    { name: 'Pending Coordinator', value: stats.pendingCoordinator },
    { name: 'Pending Accounts', value: stats.pendingAccounts },
    { name: 'Confirmed', value: stats.approvedFinal },
    { name: 'Rejected L1', value: stats.rejectedL1 },
    { name: 'Rejected L2', value: stats.rejectedL2 },
  ].filter(d => d.value > 0) : [];

  const handleExportPDF = () => {
    exportToPDF(
      ['Route', 'Capacity', 'Occupied', 'Available', 'Occupancy %', 'Revenue'],
      routeStats.map(r => [r.routeName, r.seatCapacity, r.occupiedSeats, r.availableSeats, `${r.occupancyRate}%`, formatCurrency(r.revenue)]),
      'Route Analytics Report',
      'route-analytics'
    );
  };

  return (
    <Layout title="Analytics">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue) },
            { label: 'Total Students', value: stats?.approvedFinal },
            { label: 'Total Routes', value: stats?.totalRoutes },
            { label: 'Total Colleges', value: stats?.totalColleges },
          ].map(({ label, value }) => (
            <div key={label} className="stat-card">
              <p className="stat-value">{value ?? '—'}</p>
              <p className="stat-label">{label}</p>
            </div>
          ))}
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <>
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2>Route Occupancy</h2>
                <button onClick={handleExportPDF} className="btn-outline text-xs">
                  <Download size={14} /> Export PDF
                </button>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={routeStats} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="routeName" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, n) => [n === 'revenue' ? formatCurrency(v) : v, n]} />
                  <Bar dataKey="occupiedSeats" name="Occupied" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="availableSeats" name="Available" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {statusPieData.length > 0 && (
                <div className="card">
                  <h2 className="mb-4">Application Status Distribution</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {statusPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="card">
                <h2 className="mb-4">Revenue by Route</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={routeStats.slice(0, 6)} margin={{ left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="routeName" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2>Route Details</h2>
                <button onClick={() => exportToCSV(routeStats, 'route-stats')} className="btn-outline text-xs">
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Capacity</th>
                      <th>Occupied</th>
                      <th>Available</th>
                      <th>Occupancy</th>
                      <th>Revenue</th>
                      <th>Applications</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeStats.map(route => (
                      <tr key={route.routeId}>
                        <td className="font-medium">{route.routeName}</td>
                        <td>{route.seatCapacity}</td>
                        <td>{route.occupiedSeats}</td>
                        <td>{route.availableSeats}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${route.occupancyRate >= 90 ? 'bg-red-500' : route.occupancyRate >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${route.occupancyRate}%` }} />
                            </div>
                            <span className={`text-sm font-medium ${getOccupancyColor(route.occupancyRate)}`}>{route.occupancyRate}%</span>
                          </div>
                        </td>
                        <td>{formatCurrency(route.revenue)}</td>
                        <td>{route.totalApplications}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
