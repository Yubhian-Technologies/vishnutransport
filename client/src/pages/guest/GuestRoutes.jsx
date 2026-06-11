import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { routesAPI, collegesAPI, applicationsAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { Bus, MapPin, ChevronDown, ChevronRight, Building2, User, Loader2 } from 'lucide-react';

const STATUS_LABELS = {
  pending_coordinator: { label: 'Pending Coordinator', cls: 'bg-yellow-100 text-yellow-700' },
  pending_accounts:    { label: 'Pending Accounts',    cls: 'bg-blue-100 text-blue-700' },
  approved_final:      { label: 'Approved',            cls: 'bg-green-100 text-green-700' },
  rejected_l1:         { label: 'Rejected (L1)',        cls: 'bg-red-100 text-red-600' },
  rejected_l2:         { label: 'Rejected (L2)',        cls: 'bg-red-100 text-red-600' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>;
}

function RouteApplications({ routeId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest-route-applications', routeId],
    queryFn: () => applicationsAPI.getAll({ routeId, limit: 200 }),
  });

  if (isLoading) return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
      <Loader2 size={15} className="animate-spin" /> Loading students...
    </div>
  );
  if (isError) return <p className="text-sm text-red-500 py-2">Failed to load student data.</p>;

  const apps = data?.data || [];
  if (apps.length === 0) return <p className="text-sm text-gray-400 py-2 text-center">No applications for this route yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium">#</th>
            <th className="text-left py-2 pr-4 font-medium">Name</th>
            <th className="text-left py-2 pr-4 font-medium">Reg No.</th>
            <th className="text-left py-2 pr-4 font-medium">College</th>
            <th className="text-left py-2 pr-4 font-medium">Branch</th>
            <th className="text-left py-2 pr-4 font-medium">Boarding Point</th>
            <th className="text-left py-2 pr-4 font-medium">Fare</th>
            <th className="text-left py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {apps.map((app, i) => (
            <tr key={app.id} className="hover:bg-gray-50">
              <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
              <td className="py-2 pr-4 font-medium text-gray-800">{app.name || '—'}</td>
              <td className="py-2 pr-4 text-gray-600">{app.regNo || '—'}</td>
              <td className="py-2 pr-4 text-gray-600 max-w-[140px] truncate">{app.college || '—'}</td>
              <td className="py-2 pr-4 text-gray-600">{app.branch || '—'}</td>
              <td className="py-2 pr-4 text-gray-600">{app.boardingPointName || '—'}</td>
              <td className="py-2 pr-4 text-gray-700">{app.fare != null ? formatCurrency(app.fare) : '—'}</td>
              <td className="py-2"><StatusBadge status={app.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">{apps.length} application{apps.length !== 1 ? 's' : ''} total</p>
    </div>
  );
}

export default function GuestRoutes() {
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [expandedRoute, setExpandedRoute] = useState(null);

  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ['routes-occupancy'],
    queryFn: () => routesAPI.getAll({ includeOccupancy: 'true' }),
  });

  const { data: colleges = [] } = useQuery({
    queryKey: ['colleges'],
    queryFn: collegesAPI.getAll,
  });

  const filtered = selectedCollege === 'all'
    ? routes
    : routes.filter(r => Array.isArray(r.collegeIds) && r.collegeIds.includes(selectedCollege));

  return (
    <Layout title="Bus Routes">
      <div className="space-y-4">
        {/* College filter */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 size={16} className="text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">Filter by College:</span>
            <button
              onClick={() => setSelectedCollege('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCollege === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Colleges
            </button>
            {colleges.map(college => (
              <button
                key={college.id}
                onClick={() => setSelectedCollege(college.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCollege === college.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {college.name}
              </button>
            ))}
          </div>
        </div>

        {routesLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <div className="card text-center py-10 text-gray-500 text-sm">
            No routes found for this college.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(route => {
              const occupancy = route.seatCapacity > 0
                ? Math.round(((route.occupiedSeats || 0) / route.seatCapacity) * 100)
                : 0;
              const isExpanded = expandedRoute === route.id;

              return (
                <div key={route.id} className="card">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedRoute(isExpanded ? null : route.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                          <Bus size={18} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">{route.routeName}</p>
                          {(route.startPoint || route.endPoint) && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={11} />
                              {route.startPoint}{route.startPoint && route.endPoint ? ' → ' : ''}{route.endPoint}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-semibold text-gray-800">{formatCurrency(route.fare)}</p>
                          <p className="text-xs text-gray-400">per year</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${
                            occupancy >= 90 ? 'text-red-600' : occupancy >= 70 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {route.availableSeats ?? (route.seatCapacity - (route.occupiedSeats || 0))} left
                          </p>
                          <p className="text-xs text-gray-400">{route.occupiedSeats || 0}/{route.seatCapacity} seats</p>
                        </div>
                        {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                      </div>
                    </div>

                    {/* Occupancy bar */}
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          occupancy >= 90 ? 'bg-red-500' : occupancy >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(occupancy, 100)}%` }}
                      />
                    </div>
                  </button>

                  {/* Expanded details + students */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      {/* Route meta */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        {route.routeNumber && (
                          <div>
                            <p className="text-xs text-gray-400">Route No.</p>
                            <p className="font-medium text-gray-800">{route.routeNumber}</p>
                          </div>
                        )}
                        {route.busNumber && (
                          <div>
                            <p className="text-xs text-gray-400">Bus No.</p>
                            <p className="font-medium text-gray-800">{route.busNumber}</p>
                          </div>
                        )}
                        {route.driverName && (
                          <div>
                            <p className="text-xs text-gray-400">Driver</p>
                            <p className="font-medium text-gray-800">{route.driverName}</p>
                          </div>
                        )}
                        {route.driverPhone && (
                          <div>
                            <p className="text-xs text-gray-400">Driver Phone</p>
                            <p className="font-medium text-gray-800">{route.driverPhone}</p>
                          </div>
                        )}
                        {route.inchargeName && (
                          <div>
                            <p className="text-xs text-gray-400">Incharge</p>
                            <p className="font-medium text-gray-800">{route.inchargeName}</p>
                          </div>
                        )}
                      </div>

                      {/* Stops */}
                      {Array.isArray(route.stops) && route.stops.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">Stops</p>
                          <div className="flex flex-wrap gap-2">
                            {route.stops.map((stop, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                                <MapPin size={10} className="text-gray-400" />
                                {stop.name}
                                {stop.time && <span className="text-gray-400">· {stop.time}</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Students table */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-1">
                          <User size={12} /> Students Applied
                        </p>
                        <RouteApplications routeId={route.id} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
