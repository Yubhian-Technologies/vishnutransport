import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationsAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { CheckCircle2, XCircle, Clock, Bus, FileText, Upload, X, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

const TIMELINE = [
  { status: ['pending_coordinator', 'pending_accounts', 'approved_final', 'rejected_l1', 'rejected_l2'], label: 'Application Submitted', icon: FileText },
  { status: ['pending_accounts', 'approved_final', 'rejected_l2'], label: 'Coordinator Approved', icon: CheckCircle2, failStatus: ['rejected_l1'], failLabel: 'Rejected by Coordinator', failIcon: XCircle },
  { status: ['approved_final'], label: 'Accounts Approved', icon: CheckCircle2, failStatus: ['rejected_l2'], failLabel: 'Rejected by Accounts', failIcon: XCircle },
  { status: ['approved_final'], label: 'Seat Confirmed', icon: Bus },
];

const DUE_STATUS_CONFIG = {
  pending_upload: { label: 'Due Payment Required', color: 'amber', icon: Clock },
  pending_verification: { label: 'Due Payment Under Review', color: 'blue', icon: Clock },
  verified: { label: 'Due Payment Verified', color: 'green', icon: CheckCircle2 },
  rejected: { label: 'Due Payment Rejected', color: 'red', icon: XCircle },
};

function DuePaymentUploader({ appId }) {
  const [file, setFile] = useState(null);
  const queryClient = useQueryClient();

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [] },
    maxSize: 5242880,
    maxFiles: 1,
  });

  const mutation = useMutation({
    mutationFn: () => applicationsAPI.submitDuePayment(appId, file),
    onSuccess: () => {
      toast.success('Due payment submitted for verification');
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${isDragActive ? 'border-amber-500 bg-amber-50' : 'border-gray-300 hover:border-amber-400'}`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-red-500">
              <X size={15} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={22} className="mx-auto text-gray-400 mb-1" />
            <p className="text-sm text-gray-600">Drop due payment proof here or click to browse</p>
            <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, PDF up to 5MB</p>
          </>
        )}
      </div>
      <button
        onClick={() => mutation.mutate()}
        disabled={!file || mutation.isPending}
        className="btn-primary w-full"
      >
        {mutation.isPending ? 'Submitting…' : 'Submit Due Payment Proof'}
      </button>
    </div>
  );
}

export default function ApplicationStatus() {
  const { role } = useAuth();
  const base = role === 'faculty' ? '/faculty' : '/student';
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: applicationsAPI.getMy,
  });

  const app = apps[0];

  if (isLoading) return <Layout title="Application Status"><LoadingSpinner /></Layout>;

  if (!app) {
    return (
      <Layout title="Application Status">
        <div className="card text-center py-12">
          <Bus size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No Application Found</h3>
          <Link to={`${base}/apply`} className="btn-primary inline-flex mt-4">
            Apply Now
          </Link>
        </div>
      </Layout>
    );
  }

  const hasDue = app.dueAmount > 0 && app.status === 'approved_final';
  const dueConfig = hasDue && app.dueStatus ? DUE_STATUS_CONFIG[app.dueStatus] : null;

  return (
    <Layout title="Application Status">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2>Application Details</h2>
            <StatusBadge status={app.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              ['Name', app.name],
              ['Reg. No.', app.regNo],
              ['Branch', app.branch],
              ['College', app.college],
              ['Route', app.routeName],
              ['Boarding Point', app.boardingPointName],
              ['Fare Paid', formatCurrency(app.fare)],
              ['Payment Type', app.paymentType === 'coordinator_partial' ? 'Coordinator Partial' : app.paymentType === 'partial' ? 'Partial' : 'Full'],
              ['Submitted', formatDateTime(app.submittedAt)],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-medium text-sm mt-0.5 text-gray-800">{value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Due amount info */}
          {hasDue && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-800">
                Due Amount: {formatCurrency(app.dueAmount)}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Full fare: {formatCurrency(app.fullFare)}</p>
            </div>
          )}

          {app.paymentProofUrl && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Initial Payment Proof</p>
              <a href={app.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="btn-outline text-xs inline-flex">
                View Uploaded Proof
              </a>
            </div>
          )}
        </div>

        {/* Due payment section */}
        {hasDue && dueConfig && (
          <div className={`card border-l-4 ${
            app.dueStatus === 'verified' ? 'border-green-400' :
            app.dueStatus === 'rejected' ? 'border-red-400' :
            app.dueStatus === 'pending_verification' ? 'border-blue-400' :
            'border-amber-400'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <dueConfig.icon size={18} className={`text-${dueConfig.color}-500`} />
              <h3 className={`font-semibold text-${dueConfig.color}-800`}>{dueConfig.label}</h3>
            </div>

            {app.dueStatus === 'verified' && (
              <p className="text-sm text-green-700">
                Due payment of {formatCurrency(app.dueAmount)} has been verified.
                {app.dueReviewedAt && <span className="text-xs text-gray-500 ml-1">{formatDateTime(app.dueReviewedAt)}</span>}
              </p>
            )}

            {app.dueStatus === 'pending_verification' && (
              <div className="space-y-2">
                <p className="text-sm text-blue-700">Your due payment proof is under review by the accounts team.</p>
                {app.duePaymentProofUrl && (
                  <a href={app.duePaymentProofUrl} target="_blank" rel="noopener noreferrer" className="btn-outline text-xs inline-flex">
                    View Submitted Proof
                  </a>
                )}
              </div>
            )}

            {app.dueStatus === 'rejected' && (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700 font-medium flex items-center gap-1.5">
                    <AlertCircle size={14} /> Due Payment Rejected
                  </p>
                  {app.dueRejectionReason && (
                    <p className="text-xs text-red-600 mt-1">Reason: {app.dueRejectionReason}</p>
                  )}
                  <p className="text-xs text-red-500 mt-1">Please upload a valid payment proof for {formatCurrency(app.dueAmount)}.</p>
                </div>
                <DuePaymentUploader appId={app.id} />
              </div>
            )}

            {app.dueStatus === 'pending_upload' && (
              <div className="space-y-3">
                <p className="text-sm text-amber-700">
                  Please pay the remaining <strong>{formatCurrency(app.dueAmount)}</strong> and upload the proof below.
                </p>
                <DuePaymentUploader appId={app.id} />
              </div>
            )}
          </div>
        )}

        <div className="card">
          <h2 className="mb-5">Verification Timeline</h2>
          <div className="space-y-4">
            {TIMELINE.map((item, i) => {
              const isDone = item.status.includes(app.status);
              const isFailed = item.failStatus?.includes(app.status);
              const Icon = isFailed ? (item.failIcon || XCircle) : item.icon;
              const label = isFailed ? (item.failLabel || item.label) : item.label;

              return (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-100 text-green-600' : isFailed ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                      <Icon size={18} />
                    </div>
                    {i < TIMELINE.length - 1 && (
                      <div className={`w-0.5 flex-1 mt-1 ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} style={{ minHeight: '2rem' }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`font-medium text-sm ${isDone ? 'text-green-700' : isFailed ? 'text-red-700' : 'text-gray-400'}`}>{label}</p>
                    {isFailed && (app.l1RejectionReason || app.l2RejectionReason) && (
                      <p className="text-xs text-red-500 mt-1 bg-red-50 p-2 rounded">
                        Reason: {app.l1RejectionReason || app.l2RejectionReason}
                      </p>
                    )}
                    {isDone && i === 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(app.submittedAt)}</p>
                    )}
                    {isDone && i === 1 && app.l1ReviewedAt && (
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(app.l1ReviewedAt)}</p>
                    )}
                    {isDone && i === 2 && app.l2ReviewedAt && (
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(app.l2ReviewedAt)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {['rejected_l1', 'rejected_l2'].includes(app.status) && (
          <div className="card bg-orange-50 border-orange-200">
            <p className="text-orange-800 font-medium mb-1">Application Rejected</p>
            <p className="text-sm text-orange-700">You may submit a new application after addressing the rejection reason.</p>
            <Link to={`${base}/apply`} className="btn-primary inline-flex mt-3 text-sm">
              Submit New Application
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
