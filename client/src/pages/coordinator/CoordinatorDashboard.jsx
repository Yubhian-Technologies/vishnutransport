import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { analyticsAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { FileText, Building2, Route, BarChart3, Clock, CheckCircle2, XCircle, Users } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color = 'primary', to }) => {
  const colorMap = {
    primary: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="stat-card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        {to && <Link to={to} className="text-xs text-primary-600 hover:underline">View →</Link>}
      </div>
      <p className="stat-value mt-3">{value ?? '—'}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
};

export default function CoordinatorDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: analyticsAPI.getDashboard,
  });
  const { data: routeStats = [] } = useQuery({
    queryKey: ['route-stats'],
    queryFn: analyticsAPI.getRoutes,
  });

  return (
    <Layout title="Coordinator Dashboard">
      <div className="space-y-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Pending Review" value={stats?.pendingCoordinator} icon={Clock} color="yellow" to="/coordinator/applications?status=pending_coordinator" />
              <StatCard label="Pending Accounts" value={stats?.pendingAccounts} icon={FileText} color="primary" />
              <StatCard label="Seats Confirmed" value={stats?.approvedFinal} icon={CheckCircle2} color="green" />
              <StatCard label="Total Applications" value={stats?.totalApplications} icon={Users} color="purple" to="/coordinator/applications" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Total Revenue" value={formatCurrency(stats?.totalRevenue)} icon={BarChart3} color="green" />
              <StatCard label="Bus Routes" value={stats?.totalRoutes} icon={Route} color="primary" to="/coordinator/routes" />
              <StatCard label="Colleges" value={stats?.totalColleges} icon={Building2} color="purple" to="/coordinator/colleges" />
            </div>

            {routeStats.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2>Route Occupancy</h2>
                  <Link to="/coordinator/analytics" className="text-sm text-primary-600 hover:underline">Full Analytics →</Link>
                </div>
                <div className="space-y-3">
                  {routeStats.slice(0, 5).map(route => (
                    <div key={route.routeId} className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{route.routeName}</p>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {route.occupiedSeats}/{route.seatCapacity}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${route.occupancyRate >= 90 ? 'bg-red-500' : route.occupancyRate >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${route.occupancyRate}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-sm font-semibold w-12 text-right ${route.occupancyRate >= 90 ? 'text-red-600' : route.occupancyRate >= 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {route.occupancyRate}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { to: '/coordinator/applications', icon: FileText, label: 'Review Applications', desc: `${stats?.pendingCoordinator || 0} pending` },
                { to: '/coordinator/colleges', icon: Building2, label: 'Manage Colleges', desc: 'QR codes & bank details' },
                { to: '/coordinator/routes', icon: Route, label: 'Manage Routes', desc: 'Routes & boarding points' },
              ].map(({ to, icon: Icon, label, desc }) => (
                <Link key={to} to={to} className="card hover:shadow-md transition-all hover:border-primary-200 group">
                  <Icon size={24} className="text-primary-600 mb-3" />
                  <p className="font-semibold text-gray-900 group-hover:text-primary-600">{label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
