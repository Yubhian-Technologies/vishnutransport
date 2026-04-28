import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { analyticsAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { Users, Building2, Route, DollarSign, ShieldCheck, Settings, BarChart3, CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: analyticsAPI.getDashboard });
  const { data: routeStats = [] } = useQuery({ queryKey: ['route-stats'], queryFn: analyticsAPI.getRoutes });

  return (
    <Layout title="Super Admin Dashboard">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
          <h2 className="text-xl font-bold">System Overview</h2>
          <p className="text-gray-400 mt-1">Full control over the bus management system</p>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600', to: '/admin/users' },
                { label: 'Total Colleges', value: stats?.totalColleges, icon: Building2, color: 'bg-purple-50 text-purple-600', to: '/coordinator/colleges' },
                { label: 'Bus Routes', value: stats?.totalRoutes, icon: Route, color: 'bg-indigo-50 text-indigo-600', to: '/coordinator/routes' },
                { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue), icon: DollarSign, color: 'bg-green-50 text-green-600' },
              ].map(({ label, value, icon: Icon, color, to }) => (
                <div key={label} className="stat-card hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-lg ${color}`}><Icon size={20} /></div>
                    {to && <Link to={to} className="text-xs text-primary-600 hover:underline">Manage →</Link>}
                  </div>
                  <p className="stat-value mt-3">{value ?? '—'}</p>
                  <p className="stat-label">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Pending (Coordinator)', value: stats?.pendingCoordinator, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
                { label: 'Pending (Accounts)', value: stats?.pendingAccounts, icon: Clock, color: 'text-blue-600 bg-blue-50' },
                { label: 'Confirmed', value: stats?.approvedFinal, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
                { label: 'Rejected L1', value: stats?.rejectedL1, icon: XCircle, color: 'text-red-600 bg-red-50' },
                { label: 'Rejected L2', value: stats?.rejectedL2, icon: XCircle, color: 'text-red-600 bg-red-50' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card text-center py-4">
                  <div className={`inline-flex p-2 rounded-lg ${color} mb-2`}><Icon size={18} /></div>
                  <p className="text-2xl font-bold">{value ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { to: '/admin/users', icon: Users, label: 'User Management', desc: 'Create & manage all roles', color: 'bg-blue-50 border-blue-200' },
                { to: '/coordinator', icon: ShieldCheck, label: 'Coordinator Panel', desc: 'Applications, routes, colleges', color: 'bg-purple-50 border-purple-200' },
                { to: '/accounts', icon: DollarSign, label: 'Accounts Panel', desc: 'Payments & financial reports', color: 'bg-green-50 border-green-200' },
                { to: '/admin/config', icon: Settings, label: 'System Config', desc: 'Global system settings', color: 'bg-gray-50 border-gray-200' },
                { to: '/coordinator/analytics', icon: BarChart3, label: 'Analytics', desc: 'Full system analytics', color: 'bg-orange-50 border-orange-200' },
                { to: '/accounts/reports', icon: BarChart3, label: 'Financial Reports', desc: 'Revenue & payment data', color: 'bg-teal-50 border-teal-200' },
              ].map(({ to, icon: Icon, label, desc, color }) => (
                <Link key={to} to={to} className={`card border hover:shadow-md transition-all hover:-translate-y-0.5 ${color} group`}>
                  <Icon size={22} className="text-gray-700 mb-2" />
                  <p className="font-semibold text-gray-900 group-hover:text-primary-700">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </Link>
              ))}
            </div>

            {routeStats.length > 0 && (
              <div className="card">
                <h2 className="mb-4">Route Overview</h2>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Route</th><th>Capacity</th><th>Occupied</th><th>Available</th><th>Occupancy</th><th>Revenue</th></tr>
                    </thead>
                    <tbody>
                      {routeStats.map(r => (
                        <tr key={r.routeId}>
                          <td className="font-medium">{r.routeName}</td>
                          <td>{r.seatCapacity}</td>
                          <td>{r.occupiedSeats}</td>
                          <td>{r.availableSeats}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${r.occupancyRate >= 90 ? 'bg-red-500' : r.occupancyRate >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${r.occupancyRate}%` }} />
                              </div>
                              <span className="text-sm">{r.occupancyRate}%</span>
                            </div>
                          </td>
                          <td className="font-medium text-green-700">{formatCurrency(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
