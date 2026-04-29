import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { attendanceAPI, routesAPI } from '../../utils/api';
import { format } from 'date-fns';
import { Sun, Sunset, Bus, Search } from 'lucide-react';

const PERIOD_LABELS = { morning: 'Morning', evening: 'Evening' };

export default function AttendanceOverview() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [routeFilter, setRouteFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: () => routesAPI.getAll({}),
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['all-attendance', selectedDate, routeFilter],
    queryFn: () => attendanceAPI.getAll({ date: selectedDate, routeId: routeFilter || undefined }),
  });

  const filtered = records.filter(r =>
    !search ||
    r.studentName.toLowerCase().includes(search.toLowerCase()) ||
    r.regNo.toLowerCase().includes(search.toLowerCase())
  );

  // Stats per route
  const routeStats = routes.map(route => {
    const routeRecords = records.filter(r => r.routeId === route.id);
    return {
      ...route,
      morning: routeRecords.filter(r => r.period === 'morning').length,
      evening: routeRecords.filter(r => r.period === 'evening').length,
    };
  }).filter(r => r.morning > 0 || r.evening > 0);

  return (
    <Layout title="Attendance Overview">
      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={e => setSelectedDate(e.target.value)}
            className="input w-44 text-sm"
          />
          <select value={routeFilter} onChange={e => setRouteFilter(e.target.value)} className="input w-52 text-sm">
            <option value="">All Routes</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="input pl-9 text-sm" />
          </div>
        </div>

        {/* Per-route summary cards */}
        {routeStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {routeStats.map(route => (
              <div key={route.id} className="card space-y-2">
                <div className="flex items-center gap-2">
                  <Bus size={15} className="text-primary-600" />
                  <p className="font-semibold text-sm text-gray-800 truncate">{route.routeName}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs bg-amber-50 rounded-lg px-2 py-1.5">
                    <Sun size={13} className="text-amber-600" />
                    <span className="text-amber-700 font-medium">{route.morning} Morning</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs bg-blue-50 rounded-lg px-2 py-1.5">
                    <Sunset size={13} className="text-blue-600" />
                    <span className="text-blue-700 font-medium">{route.evening} Evening</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail table */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''} — {format(new Date(selectedDate + 'T12:00:00'), 'dd MMM yyyy')}
          </h3>

          {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No attendance records found</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>Student</th>
                    <th>College</th>
                    <th>Route</th>
                    <th>Boarding Point</th>
                    <th>Period</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="text-sm text-gray-500 text-center">{idx + 1}</td>
                      <td>
                        <p className="font-medium text-sm">{r.studentName}</p>
                        <p className="text-xs text-gray-400">{r.regNo} · {r.branch}</p>
                      </td>
                      <td className="text-sm text-gray-600">{r.college || '—'}</td>
                      <td className="text-sm">{r.routeName}</td>
                      <td className="text-sm">{r.boardingPointName}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${r.period === 'morning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {r.period === 'morning' ? <Sun size={11} /> : <Sunset size={11} />}
                          {PERIOD_LABELS[r.period]}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500">{format(new Date(r.timestamp), 'hh:mm a')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
