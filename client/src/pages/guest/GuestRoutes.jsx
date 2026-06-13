import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationsAPI, routesAPI } from '../../utils/api';
import { formatCurrency, formatDateTime, exportToCSV, STATUS_LABELS } from '../../utils/helpers';
import { Search, Download } from 'lucide-react';

const DUE_FILTER_OPTIONS = [
  { label: 'Payment Status', value: '' },
  { label: 'Full Payment', value: 'full' },
  { label: 'Has Due Amount', value: 'has_due' },
];

export default function GuestRoutes() {
  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dueFilter, setDueFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['guest-all-applications'],
    queryFn: () => applicationsAPI.getAll({ limit: 500 }),
  });

  const { data: routesData = [] } = useQuery({
    queryKey: ['routes-all'],
    queryFn: () => routesAPI.getAll(),
  });

  const busNumberMap = useMemo(() =>
    Object.fromEntries(routesData.map(r => [r.id, r.busNumber])),
    [routesData]
  );

  const allApps = data?.data || [];

  const colleges = useMemo(() => {
    const seen = new Set();
    return allApps.map(a => a.college).filter(c => c && !seen.has(c) && seen.add(c)).sort();
  }, [allApps]);

  const routes = useMemo(() => {
    const seen = new Set();
    return allApps
      .map(a => ({ id: a.routeId, name: a.routeName }))
      .filter(r => r.name && !seen.has(r.id) && seen.add(r.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allApps]);

  const apps = useMemo(() => {
    return allApps.filter(app => {
      if (search) {
        const q = search.toLowerCase();
        if (!app.name?.toLowerCase().includes(q) && !(app.regNo || '').toLowerCase().includes(q)) return false;
      }
      if (routeFilter && app.routeId !== routeFilter) return false;
      if (collegeFilter && app.college !== collegeFilter) return false;
      if (statusFilter && app.status !== statusFilter) return false;
      if (dueFilter) {
        const isPartial = app.paymentType === 'partial' || app.paymentType === 'coordinator_partial';
        const clearedDue = isPartial && app.dueStatus === 'verified';
        if (dueFilter === 'full' && isPartial && !clearedDue) return false;
        if (dueFilter === 'has_due' && (!isPartial || clearedDue)) return false;
      }
      return true;
    });
  }, [allApps, search, routeFilter, collegeFilter, statusFilter, dueFilter]);

  const hasActiveFilters = search || routeFilter || collegeFilter || statusFilter || dueFilter;
  const resetFilters = () => {
    setSearch(''); setRouteFilter(''); setCollegeFilter(''); setStatusFilter(''); setDueFilter('');
  };

  const handleExport = () => {
    exportToCSV(apps.map((app, i) => ({
      '#': i + 1,
      'Name': app.name || '',
      'Reg No': app.regNo || '',
      'Branch': app.branch || '',
      'Role': app.applicantRole === 'bus_incharge' ? 'Incharge' : app.applicantRole || 'Student',
      'College': app.college || '',
      'Route': app.routeName || '',
      'Bus No': busNumberMap[app.routeId] || '',
      'Boarding Point': app.boardingPointName || '',
      'Fare': app.fare ?? '',
      'Payment Type': app.paymentType || '',
      'Status': STATUS_LABELS[app.status] || app.status || '',
      'Submitted At': app.submittedAt ? formatDateTime(app.submittedAt) : '',
    })), 'bus_applications');
  };

  return (
    <Layout title="Bus Routes">
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or reg no..."
              className="input pl-9 text-sm"
            />
          </div>

          <select value={routeFilter} onChange={e => setRouteFilter(e.target.value)} className="input text-sm w-48">
            <option value="">All Routes</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)} className="input text-sm w-48">
            <option value="">All Colleges</option>
            {colleges.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input text-sm w-44">
            <option value="">All Status</option>
            <option value="pending_coordinator">Pending Coordinator</option>
            <option value="pending_accounts">Pending Accounts</option>
            <option value="approved_final">Confirmed</option>
            <option value="rejected_l1">Rejected (L1)</option>
            <option value="rejected_l2">Rejected (L2)</option>
          </select>

          <select value={dueFilter} onChange={e => setDueFilter(e.target.value)} className="input text-sm w-44">
            {DUE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-gray-800 underline whitespace-nowrap">
              Clear filters
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">{apps.length} result{apps.length !== 1 ? 's' : ''}</span>
            <button onClick={handleExport} disabled={apps.length === 0} className="btn-outline text-sm">
              <Download size={15} /> Export Excel
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? <LoadingSpinner /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['#', 'Student', 'College / Route', 'Fare', 'Status', 'Submitted'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {apps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                        No applications found.
                      </td>
                    </tr>
                  ) : apps.map((app, i) => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs w-8">{i + 1}</td>

                      {/* Student */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 uppercase text-xs tracking-wide">{app.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {app.regNo && <span>{app.regNo}</span>}
                          {app.regNo && app.branch && <span> · </span>}
                          {app.branch && <span>{app.branch}</span>}
                        </p>
                        <span className="mt-1 inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                          {app.applicantRole === 'bus_incharge' ? 'Incharge' : app.applicantRole || 'Student'}
                        </span>
                      </td>

                      {/* College / Route */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-800 uppercase tracking-wide">
                          {app.college || (app.applicantRole === 'bus_incharge' ? 'Staff' : '—')}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{app.routeName || '—'}</p>
                        {busNumberMap[app.routeId] && (
                          <p className="text-xs font-medium text-blue-600 mt-0.5">
                            Bus: {busNumberMap[app.routeId]}
                          </p>
                        )}
                      </td>

                      {/* Fare */}
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                        {formatCurrency(app.fare)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status} />
                      </td>

                      {/* Submitted */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(app.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
