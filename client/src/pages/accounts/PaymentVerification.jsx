import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationsAPI, routesAPI } from '../../utils/api';
import { formatCurrency, formatDateTime, exportToCSV } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Eye, Download, ExternalLink, Filter, X } from 'lucide-react';

const STATUS_TABS = [
  { label: 'Pending', value: 'pending_accounts' },
  { label: 'Due Payments', value: '__due__' },
  { label: 'Approved', value: 'approved_final' },
  { label: 'Rejected', value: 'rejected_l2' },
  { label: 'All', value: '' },
];

export default function PaymentVerification() {
  const [statusFilter, setStatusFilter] = useState('pending_accounts');
  const [routeFilter, setRouteFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [statusFilterInline, setStatusFilterInline] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isDueReject, setIsDueReject] = useState(false);
  const queryClient = useQueryClient();

  const isDueTab = statusFilter === '__due__';

  const { data, isLoading } = useQuery({
    queryKey: ['applications-accounts', statusFilter],
    queryFn: () => isDueTab
      ? applicationsAPI.getAll({ status: 'approved_final' })
      : applicationsAPI.getAll({ status: statusFilter }),
  });

  const { data: routesData } = useQuery({
    queryKey: ['routes-all'],
    queryFn: () => routesAPI.getAll(),
  });

  const busNumberMap = React.useMemo(() => {
    const routes = Array.isArray(routesData) ? routesData : [];
    return Object.fromEntries(routes.map(r => [r.id, r.busNumber]));
  }, [routesData]);

  const approveMutation = useMutation({
    mutationFn: (id) => applicationsAPI.accountsReview(id, { action: 'approve' }),
    onSuccess: () => {
      toast.success('Payment verified — seat confirmed!');
      queryClient.invalidateQueries({ queryKey: ['applications-accounts'] });
      setSelectedApp(null);
    },
    onError: e => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason, isDue }) =>
      isDue
        ? applicationsAPI.dueReview(id, { action: 'reject', reason })
        : applicationsAPI.accountsReview(id, { action: 'reject', reason }),
    onSuccess: () => {
      toast.success(isDueReject ? 'Due payment rejected' : 'Application rejected');
      setRejectModal(false);
      setRejectReason('');
      setIsDueReject(false);
      queryClient.invalidateQueries({ queryKey: ['applications-accounts'] });
      setSelectedApp(null);
    },
    onError: e => toast.error(e.message),
  });

  const approveDueMutation = useMutation({
    mutationFn: (id) => applicationsAPI.dueReview(id, { action: 'approve' }),
    onSuccess: () => {
      toast.success('Due payment verified!');
      queryClient.invalidateQueries({ queryKey: ['applications-accounts'] });
      setSelectedApp(null);
    },
    onError: e => toast.error(e.message),
  });

  const rawApps = data?.data || [];
  const baseApps = isDueTab
    ? rawApps.filter(a => a.dueStatus === 'pending_verification')
    : rawApps;

  const apps = baseApps
    .filter(a => !routeFilter || a.routeId === routeFilter)
    .filter(a => !collegeFilter || a.college === collegeFilter)
    .filter(a => !statusFilterInline || (isDueTab ? a.dueStatus === statusFilterInline : a.status === statusFilterInline))
    .filter(a => {
      if (!paymentTypeFilter) return true;
      const isPartial = a.paymentType === 'partial' || a.paymentType === 'coordinator_partial';
      const clearedDue = isPartial && a.dueStatus === 'verified';
      if (paymentTypeFilter === 'full') return a.paymentType === 'full' || clearedDue;
      if (paymentTypeFilter === 'due') return isPartial && !clearedDue;
      return true;
    });

  const collegeOptions = React.useMemo(
    () => [...new Set(baseApps.map(a => a.college).filter(Boolean))].sort(),
    [baseApps]
  );

  const hasFilters = routeFilter || collegeFilter || statusFilterInline || paymentTypeFilter;

  return (
    <Layout title="Payment Verification">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === tab.value ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto">
            <button onClick={() => exportToCSV(apps.map((a, i) => ({
              'S.No.': i + 1,
              Name: a.name,
              RegNo: a.regNo,
              Type: a.applicantRole === 'faculty' ? 'Faculty' : 'Student',
              College: a.college || '—',
              Route: a.routeName,
              'Bus No.': busNumberMap[a.routeId] || '—',
              'Boarding Point': a.boardingPointName,
              Fare: isDueTab ? a.dueAmount : a.fare,
              'Payment Type': (() => { const c = (a.paymentType === 'partial' || a.paymentType === 'coordinator_partial') && a.dueStatus === 'verified'; return a.paymentType === 'full' || c ? 'Full' : a.paymentType === 'coordinator_partial' ? 'Coordinator Partial' : 'Partial'; })(),
              Status: isDueTab ? a.dueStatus : a.status,
              Submitted: isDueTab ? a.duePaymentSubmittedAt : a.submittedAt,
            })), 'payments')} className="btn-outline text-xs">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={routeFilter}
            onChange={e => setRouteFilter(e.target.value)}
            className="input py-1 text-sm w-auto min-w-[160px]"
          >
            <option value="">All Routes</option>
            {(Array.isArray(routesData) ? routesData : []).map(r => (
              <option key={r.id} value={r.id}>{r.routeName}{r.busNumber ? ` (${r.busNumber})` : ''}</option>
            ))}
          </select>
          <select
            value={collegeFilter}
            onChange={e => setCollegeFilter(e.target.value)}
            className="input py-1 text-sm w-auto min-w-[160px]"
          >
            <option value="">All Colleges</option>
            {collegeOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilterInline}
            onChange={e => setStatusFilterInline(e.target.value)}
            className="input py-1 text-sm w-auto min-w-[140px]"
          >
            <option value="">All Status</option>
            {isDueTab ? (
              <>
                <option value="pending_verification">Pending Verification</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </>
            ) : (
              <>
                <option value="pending_accounts">Pending</option>
                <option value="approved_final">Approved</option>
                <option value="rejected_l2">Rejected</option>
              </>
            )}
          </select>
          <select
            value={paymentTypeFilter}
            onChange={e => setPaymentTypeFilter(e.target.value)}
            className="input py-1 text-sm w-auto min-w-[140px]"
          >
            <option value="">All Payment Types</option>
            <option value="full">Full Payment</option>
            <option value="due">Partial / Due</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setRouteFilter(''); setCollegeFilter(''); setStatusFilterInline(''); setPaymentTypeFilter(''); }} className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <X size={13} /> Clear
            </button>
          )}
          {hasFilters && (
            <span className="text-xs text-gray-500 ml-1">{apps.length} result{apps.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Applicant</th>
                  <th>College</th>
                  <th>Route</th>
                  <th>{isDueTab ? 'Due Amount' : 'Fare'}</th>
                  <th>Payment Proof</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No applications found</td></tr>
                ) : apps.map((app, idx) => (
                  <tr key={app.id}>
                    <td className="text-sm text-gray-500 text-center">{idx + 1}</td>
                    <td>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-xs text-gray-400">{app.regNo}</p>
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${app.applicantRole === 'faculty' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                        {app.applicantRole === 'faculty' ? 'Faculty' : 'Student'}
                      </span>
                    </td>
                    <td className="text-sm text-gray-700">{app.college || '—'}</td>
                    <td>
                      <p className="text-sm">{app.routeName}</p>
                      <p className="text-xs text-gray-400">{app.boardingPointName}</p>
                      {busNumberMap[app.routeId] && (
                        <p className="text-xs text-indigo-600 font-medium">Bus: {busNumberMap[app.routeId]}</p>
                      )}
                    </td>
                    <td className="font-semibold text-green-700">
                      {isDueTab
                        ? formatCurrency(app.dueAmount)
                        : app.paymentType === 'coordinator_partial'
                          ? formatCurrency(app.fullFare || app.fare)
                          : formatCurrency(app.fare)
                      }
                      {app.paymentType === 'coordinator_partial' && !isDueTab && (
                        app.dueStatus === 'verified'
                          ? <p className="text-xs text-green-600 font-normal">Fully paid</p>
                          : <p className="text-xs text-amber-600 font-normal">Paid {formatCurrency(app.fare)} · {formatCurrency(app.dueAmount)} due</p>
                      )}
                    </td>
                    <td>
                      {isDueTab ? (
                        app.duePaymentProofUrl ? (
                          <a href={app.duePaymentProofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
                            View <ExternalLink size={11} />
                          </a>
                        ) : <span className="text-xs text-gray-400">None</span>
                      ) : (
                        app.paymentProofUrl ? (
                          <a href={app.paymentProofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
                            View <ExternalLink size={11} />
                          </a>
                        ) : <span className="text-xs text-gray-400">None</span>
                      )}
                    </td>
                    <td><StatusBadge status={isDueTab ? `due_${app.dueStatus}` : app.status} /></td>
                    <td className="text-xs text-gray-500">
                      {isDueTab ? formatDateTime(app.duePaymentSubmittedAt) : formatDateTime(app.submittedAt)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedApp(app)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="View">
                          <Eye size={15} />
                        </button>
                        {!isDueTab && app.status === 'pending_accounts' && (
                          <>
                            <button onClick={() => approveMutation.mutate(app.id)} disabled={approveMutation.isPending} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Approve">
                              <CheckCircle2 size={15} />
                            </button>
                            <button onClick={() => { setRejectTargetId(app.id); setIsDueReject(false); setRejectModal(true); }} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Reject">
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {isDueTab && app.dueStatus === 'pending_verification' && (
                          <>
                            <button onClick={() => approveDueMutation.mutate(app.id)} disabled={approveDueMutation.isPending} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Approve Due">
                              <CheckCircle2 size={15} />
                            </button>
                            <button onClick={() => { setRejectTargetId(app.id); setIsDueReject(true); setRejectModal(true); }} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Reject Due">
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
      <Modal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} title="Payment Verification Details" size="lg">
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
                  [selectedApp.applicantRole === 'faculty' ? 'Date of Joining' : 'Academic Year', selectedApp.applicantRole === 'faculty' ? (selectedApp.dateOfJoining || '—') : (selectedApp.academicYear ? `Year ${selectedApp.academicYear}` : '—')],
                  ['Reg. No.', selectedApp.regNo],
                  ['Branch', selectedApp.branch],
                  ['College', selectedApp.college || '—'],
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

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Details</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Route', selectedApp.routeName],
                  ['Bus Number', busNumberMap[selectedApp.routeId] || '—'],
                  ['Boarding Point', selectedApp.boardingPointName],
                  ['Total Fare', formatCurrency(selectedApp.paymentType === 'coordinator_partial' ? (selectedApp.fullFare || selectedApp.fare) : selectedApp.fare)],
                  ['Payment Type', (() => { const c = (selectedApp.paymentType === 'partial' || selectedApp.paymentType === 'coordinator_partial') && selectedApp.dueStatus === 'verified'; return selectedApp.paymentType === 'full' || c ? 'Full' : selectedApp.paymentType === 'coordinator_partial' ? 'Coordinator Partial' : 'Partial'; })()],
                  ...(selectedApp.dueAmount > 0 ? [[
                    'Due Amount',
                    selectedApp.dueStatus === 'verified'
                      ? `${formatCurrency(selectedApp.dueAmount)} (Verified)`
                      : `${formatCurrency(selectedApp.dueAmount)} (${selectedApp.dueStatus || 'pending'})`,
                  ]] : []),
                  ['Submitted', formatDateTime(selectedApp.submittedAt)],
                  ['Coordinator Approved', formatDateTime(selectedApp.l1ReviewedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedApp.paymentProofUrl && (
              <div>
                <p className="text-sm font-medium mb-2">Initial Payment Proof</p>
                <a href={selectedApp.paymentProofUrl} target="_blank" rel="noreferrer" className="btn-primary text-sm inline-flex gap-2">
                  <ExternalLink size={14} /> Open Payment Proof
                </a>
              </div>
            )}

            {selectedApp.duePaymentProofUrl && (
              <div>
                <p className="text-sm font-medium mb-2">Due Payment Proof</p>
                <a href={selectedApp.duePaymentProofUrl} target="_blank" rel="noreferrer" className="btn-outline text-sm inline-flex gap-2">
                  <ExternalLink size={14} /> Open Due Payment Proof
                </a>
              </div>
            )}

            {selectedApp.l2RejectionReason && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700"><strong>Rejection Reason:</strong> {selectedApp.l2RejectionReason}</p>
              </div>
            )}

            {selectedApp.status === 'pending_accounts' && (
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button onClick={() => approveMutation.mutate(selectedApp.id)} disabled={approveMutation.isPending} className="btn-success flex-1">
                  <CheckCircle2 size={16} /> Approve & Confirm Seat
                </button>
                <button onClick={() => { setRejectTargetId(selectedApp.id); setIsDueReject(false); setRejectModal(true); }} className="btn-danger flex-1">
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}

            {isDueTab && selectedApp.dueStatus === 'pending_verification' && (
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button onClick={() => approveDueMutation.mutate(selectedApp.id)} disabled={approveDueMutation.isPending} className="btn-success flex-1">
                  <CheckCircle2 size={16} /> Verify Due Payment
                </button>
                <button onClick={() => { setRejectTargetId(selectedApp.id); setIsDueReject(true); setRejectModal(true); }} className="btn-danger flex-1">
                  <XCircle size={16} /> Reject Due
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={rejectModal} onClose={() => { setRejectModal(false); setRejectReason(''); setIsDueReject(false); }} title={isDueReject ? 'Reject Due Payment' : 'Reject Payment'} size="sm">
        <div className="space-y-4">
          {isDueReject && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
              The application will remain approved. The student can re-upload the due payment proof.
            </p>
          )}
          <div>
            <label className="label">Rejection Reason *</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explain why the payment is being rejected..."
              className="input resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setRejectModal(false); setRejectReason(''); setIsDueReject(false); }} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => rejectMutation.mutate({ id: rejectTargetId, reason: rejectReason, isDue: isDueReject })} disabled={!rejectReason.trim() || rejectMutation.isPending} className="btn-danger flex-1">
              {isDueReject ? 'Reject Due Payment' : 'Reject Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
