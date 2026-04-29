import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationsAPI } from '../../utils/api';
import { formatCurrency, formatDateTime, exportToCSV } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Eye, Download, Search } from 'lucide-react';

const STATUS_TABS = [
  { label: 'Pending', value: 'pending_coordinator' },
  { label: 'Sent to Accounts', value: 'pending_accounts' },
  { label: 'Confirmed', value: 'approved_final' },
  { label: 'Rejected L1', value: 'rejected_l1' },
  { label: 'All', value: '' },
];

const DUE_FILTER_OPTIONS = [
  { label: 'All Payment Types', value: '' },
  { label: 'Full Payment Only', value: 'full' },
  { label: 'Has Due Amount', value: 'has_due' },
  { label: 'Due: Pending Upload', value: 'pending_upload' },
  { label: 'Due: Under Review', value: 'pending_verification' },
  { label: 'Due: Verified', value: 'verified' },
  { label: 'Due: Rejected', value: 'rejected' },
];

export default function ApplicationReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get('status') || 'pending_coordinator';
  const statusFilter = rawStatus === 'all' ? '' : rawStatus;
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [dueFilter, setDueFilter] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['applications', statusFilter],
    queryFn: () => applicationsAPI.getAll({ status: statusFilter }),
  });

  const allApps = data?.data || [];

  // Derive unique colleges and routes from loaded data
  const colleges = useMemo(() => {
    const seen = new Set();
    return allApps
      .map(a => a.college)
      .filter(c => c && !seen.has(c) && seen.add(c))
      .sort();
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
      if (search && !app.name.toLowerCase().includes(search.toLowerCase()) && !app.regNo.toLowerCase().includes(search.toLowerCase())) return false;
      if (collegeFilter && app.college !== collegeFilter) return false;
      if (routeFilter && app.routeId !== routeFilter) return false;
      if (dueFilter) {
        const isPartial = app.paymentType === 'partial' || app.paymentType === 'coordinator_partial';
        const clearedDue = isPartial && app.dueStatus === 'verified';
        if (dueFilter === 'full' && isPartial && !clearedDue) return false;
        if (dueFilter === 'has_due' && (!isPartial || clearedDue)) return false;
        if (['pending_upload', 'pending_verification', 'verified', 'rejected'].includes(dueFilter) && app.dueStatus !== dueFilter) return false;
      }
      return true;
    });
  }, [allApps, search, collegeFilter, routeFilter, dueFilter]);

  const approveMutation = useMutation({
    mutationFn: (id) => applicationsAPI.coordinatorReview(id, { action: 'approve' }),
    onSuccess: () => {
      toast.success('Application approved and sent to Accounts');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => applicationsAPI.coordinatorReview(id, { action: 'reject', reason }),
    onSuccess: () => {
      toast.success('Application rejected');
      setRejectModal(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleExport = () => {
    exportToCSV(apps.map((a, i) => ({
      '#': i + 1,
      Name: a.name,
      'Reg No': a.regNo,
      Branch: a.branch,
      College: a.college,
      Route: a.routeName,
      'Boarding Point': a.boardingPointName,
      'Total Fare': a.paymentType === 'coordinator_partial' ? (a.fullFare || a.fare) : a.fare,
      'Paid': a.fare,
      'Due Amount': a.dueAmount || 0,
      'Due Status': a.dueStatus || '—',
      'Payment Type': (() => { const c = (a.paymentType === 'partial' || a.paymentType === 'coordinator_partial') && a.dueStatus === 'verified'; return a.paymentType === 'full' || c ? 'Full' : a.paymentType === 'coordinator_partial' ? 'Coordinator Partial' : 'Partial'; })(),
      Status: a.status,
      'Submitted At': a.submittedAt,
    })), 'applications');
  };

  const resetFilters = () => {
    setSearch('');
    setCollegeFilter('');
    setRouteFilter('');
    setDueFilter('');
  };

  const hasActiveFilters = search || collegeFilter || routeFilter || dueFilter;

  return (
    <Layout title="Application Review">
      <div className="space-y-4">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setSearchParams({ status: tab.value || 'all' }); resetFilters(); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === tab.value ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or reg no…"
              className="input pl-9 text-sm"
            />
          </div>

          <select
            value={collegeFilter}
            onChange={e => setCollegeFilter(e.target.value)}
            className="input text-sm w-48"
          >
            <option value="">All Colleges</option>
            {colleges.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={routeFilter}
            onChange={e => setRouteFilter(e.target.value)}
            className="input text-sm w-48"
          >
            <option value="">All Routes</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select
            value={dueFilter}
            onChange={e => setDueFilter(e.target.value)}
            className="input text-sm w-52"
          >
            {DUE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-gray-800 underline whitespace-nowrap">
              Clear filters
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">{apps.length} result{apps.length !== 1 ? 's' : ''}</span>
            <button onClick={handleExport} className="btn-outline text-sm">
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10 text-center">#</th>
                  <th>Student</th>
                  <th>College / Route</th>
                  <th>Fare</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No applications found</td></tr>
                ) : apps.map((app, idx) => (
                  <tr key={app.id}>
                    <td className="text-center text-xs text-gray-400 font-medium">{idx + 1}</td>
                    <td>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-xs text-gray-400">{app.regNo} · {app.branch}</p>
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${app.applicantRole === 'faculty' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                        {app.applicantRole === 'faculty' ? 'Faculty' : 'Student'}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm">{app.college}</p>
                      <p className="text-xs text-gray-400">{app.routeName}</p>
                    </td>
                    <td>
                      {app.paymentType === 'coordinator_partial' ? (
                        <div>
                          <p className="font-semibold">{formatCurrency(app.fullFare || app.fare)}</p>
                          {app.dueStatus === 'verified' ? (
                            <p className="text-xs text-green-600">Fully paid</p>
                          ) : (
                            <p className="text-xs text-amber-600">
                              Paid {formatCurrency(app.fare)} · Due {formatCurrency(app.dueAmount || 0)}
                            </p>
                          )}
                        </div>
                      ) : formatCurrency(app.fare)}
                    </td>
                    <td><StatusBadge status={app.status} /></td>
                    <td className="text-xs text-gray-500">{formatDateTime(app.submittedAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedApp(app)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="View details">
                          <Eye size={15} />
                        </button>
                        {app.status === 'pending_coordinator' && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate(app.id)}
                              disabled={approveMutation.isPending}
                              className="p-1.5 rounded hover:bg-green-50 text-green-600"
                              title="Approve"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              onClick={() => { setRejectTargetId(app.id); setRejectModal(true); }}
                              className="p-1.5 rounded hover:bg-red-50 text-red-600"
                              title="Reject"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Modal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} title="Application Details" size="lg">
        {selectedApp && (
          <div className="space-y-4">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Personal Details</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Name', selectedApp.name],
                  ['Name as per SSC', selectedApp.nameAsPerSSC || '—'],
                  ['Type', selectedApp.applicantRole === 'faculty' ? 'Faculty' : 'Student'],
                  ['Gender', selectedApp.gender ? selectedApp.gender.charAt(0).toUpperCase() + selectedApp.gender.slice(1) : '—'],
                  ['Blood Group', selectedApp.bloodGroup || '—'],
                  ['Academic Year', selectedApp.academicYear ? `Year ${selectedApp.academicYear}` : '—'],
                  ['Reg No', selectedApp.regNo],
                  ['Branch', selectedApp.branch],
                  ['Aadhaar', selectedApp.aadhaar || '—'],
                  ['College', selectedApp.college],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
                <div className="col-span-2 bg-gray-50 p-2.5 rounded-lg">
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="font-medium mt-0.5">{selectedApp.address || '—'}</p>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Details</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Student Phone', selectedApp.studentPhone || '—'],
                  ['Emergency Contact', selectedApp.emergencyContact || '—'],
                  ['Parent / Guardian', selectedApp.parentName || '—'],
                  ['Parent Phone', selectedApp.parentPhone || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Application Details</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Route', selectedApp.routeName],
                  ['Boarding Point', selectedApp.boardingPointName],
                  ['Payment Type', (() => { const c = (selectedApp.paymentType === 'partial' || selectedApp.paymentType === 'coordinator_partial') && selectedApp.dueStatus === 'verified'; return selectedApp.paymentType === 'full' || c ? 'Full' : selectedApp.paymentType === 'coordinator_partial' ? 'Coordinator Partial' : 'Partial'; })()],
                  ['Total Fare', formatCurrency(selectedApp.fullFare || selectedApp.fare)],
                  ...(selectedApp.paymentType === 'coordinator_partial' && selectedApp.dueStatus !== 'verified' ? [
                    ['Paid (Initial)', formatCurrency(selectedApp.fare)],
                    ['Due Amount', `${formatCurrency(selectedApp.dueAmount || 0)} (${selectedApp.dueStatus || 'pending'})`],
                  ] : []),
                  ['Status', <StatusBadge key="s" status={selectedApp.status} />],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedApp.paymentProofUrl && (
              <div>
                <p className="text-sm font-medium mb-2">Payment Proof</p>
                <a href={selectedApp.paymentProofUrl} target="_blank" rel="noreferrer" className="btn-outline text-xs">
                  View Document
                </a>
              </div>
            )}
            {selectedApp.l1RejectionReason && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700"><strong>Rejection Reason:</strong> {selectedApp.l1RejectionReason}</p>
              </div>
            )}
            {selectedApp.status === 'pending_coordinator' && (
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => { approveMutation.mutate(selectedApp.id); setSelectedApp(null); }} className="btn-success flex-1">
                  <CheckCircle2 size={16} /> Approve
                </button>
                <button onClick={() => { setRejectTargetId(selectedApp.id); setSelectedApp(null); setRejectModal(true); }} className="btn-danger flex-1">
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={rejectModal} onClose={() => { setRejectModal(false); setRejectReason(''); }} title="Reject Application" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Rejection Reason *</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explain the reason for rejection..."
              className="input resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setRejectModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => rejectMutation.mutate({ id: rejectTargetId, reason: rejectReason })}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className="btn-danger flex-1"
            >
              Reject Application
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
