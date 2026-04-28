import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { analyticsAPI, paymentsAPI } from '../../utils/api';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { ShieldCheck, BarChart3, DollarSign, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function AccountsDashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: analyticsAPI.getDashboard });
  const { data: revenue } = useQuery({ queryKey: ['revenue'], queryFn: analyticsAPI.getRevenue });
  const { data: routeStats = [] } = useQuery({ queryKey: ['route-stats'], queryFn: analyticsAPI.getRoutes });

  return (
    <Layout title="Accounts Dashboard">
      <div className="space-y-6">
        {isLoading ? <LoadingSpinner /> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pending Verification', value: stats?.pendingAccounts, icon: Clock, color: 'bg-yellow-50 text-yellow-600', to: '/accounts/verify' },
                { label: 'Payments Confirmed', value: stats?.approvedFinal, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
                { label: 'Rejected (L2)', value: stats?.rejectedL2, icon: XCircle, color: 'bg-red-50 text-red-600' },
                { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue), icon: DollarSign, color: 'bg-blue-50 text-blue-600' },
              ].map(({ label, value, icon: Icon, color, to }) => (
                <div key={label} className="stat-card">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-lg ${color}`}><Icon size={20} /></div>
                    {to && <Link to={to} className="text-xs text-primary-600 hover:underline">View →</Link>}
                  </div>
                  <p className="stat-value mt-3">{value ?? '—'}</p>
                  <p className="stat-label">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="card bg-primary-50 border-primary-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-primary-700">Payments Awaiting Verification</p>
                    <p className="text-4xl font-bold text-primary-900 mt-2">{stats?.pendingAccounts || 0}</p>
                    <p className="text-sm text-primary-600 mt-1">applications need your review</p>
                  </div>
                  <div className="p-3 bg-primary-100 rounded-xl">
                    <ShieldCheck size={28} className="text-primary-600" />
                  </div>
                </div>
                <Link to="/accounts/verify" className="btn-primary mt-4 inline-flex text-sm">
                  Verify Payments <ArrowRight size={15} />
                </Link>
              </div>

              <div className="card">
                <h3 className="mb-3">Revenue Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Total Confirmed Revenue</span>
                    <span className="font-bold text-green-700">{formatCurrency(revenue?.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Total Confirmed Students</span>
                    <span className="font-semibold">{revenue?.totalStudents || 0}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 text-sm">Active Routes</span>
                    <span className="font-semibold">{stats?.totalRoutes || 0}</span>
                  </div>
                </div>
                <Link to="/accounts/reports" className="btn-outline mt-4 inline-flex text-sm">
                  <BarChart3 size={14} /> Full Reports
                </Link>
              </div>
            </div>

            {routeStats.length > 0 && (
              <div className="card">
                <h2 className="mb-4">Revenue by Route</h2>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Route</th>
                        <th>Confirmed Students</th>
                        <th>Revenue</th>
                        <th>Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routeStats.map(r => (
                        <tr key={r.routeId}>
                          <td className="font-medium">{r.routeName}</td>
                          <td>{r.occupiedSeats}</td>
                          <td className="text-green-700 font-semibold">{formatCurrency(r.revenue)}</td>
                          <td>{r.pendingApplications}</td>
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
