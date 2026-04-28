import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationsAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatCurrency, STATUS_LABELS } from '../../utils/helpers';
import { FileText, ArrowRight, Bus, MapPin, CheckCircle2, Clock, UserCircle } from 'lucide-react';

const STEPS = [
  { key: 'pending_coordinator', label: 'Submitted', done: ['pending_coordinator', 'pending_accounts', 'approved_final', 'rejected_l1', 'rejected_l2'] },
  { key: 'pending_accounts', label: 'Coordinator Review', done: ['pending_accounts', 'approved_final', 'rejected_l2'] },
  { key: 'approved_final', label: 'Accounts Review', done: ['approved_final'] },
];

export default function StudentDashboard() {
  const { userProfile, role } = useAuth();
  const base = role === 'faculty' ? '/faculty' : '/student';
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: applicationsAPI.getMy,
  });

  const latestApp = apps[0];
  const isApproved = latestApp?.status === 'approved_final';
  const hasActiveApp = latestApp && !['rejected_l1', 'rejected_l2'].includes(latestApp.status);
  const showProfilePrompt = isApproved && !userProfile?.profileCompleted;

  return (
    <Layout title={role === 'faculty' ? 'Faculty Dashboard' : 'Student Dashboard'}>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
          <p className="text-primary-100 text-sm">Welcome back,</p>
          <h2 className="text-2xl font-bold mt-0.5">{userProfile?.name}</h2>
          {isApproved ? (
            <p className="text-primary-100 mt-2 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Your bus seat is confirmed
            </p>
          ) : (
            <p className="text-primary-100 mt-2">Manage your bus transport application</p>
          )}
        </div>

        {showProfilePrompt && (
          <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-3">
              <UserCircle size={20} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Complete your profile</p>
                <p className="text-xs text-amber-600 mt-0.5">Your seat is confirmed — please update your personal details.</p>
              </div>
            </div>
            <Link to={`${base}/profile`} className="btn-primary flex-shrink-0 text-xs py-1.5 px-3">
              Update Now
            </Link>
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : latestApp ? (
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2>Application Status</h2>
                <StatusBadge status={latestApp.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Route', value: latestApp.routeName },
                  { label: 'Boarding Point', value: latestApp.boardingPointName },
                  { label: 'Fare', value: formatCurrency(latestApp.fare) },
                  { label: 'Submitted', value: formatDate(latestApp.submittedAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium text-gray-800 mt-0.5 text-sm">{value}</p>
                  </div>
                ))}
              </div>

              <div className="relative">
                <div className="flex items-center justify-between">
                  {STEPS.map((step, i) => {
                    const isDone = step.done.includes(latestApp.status);
                    const isRejected = latestApp.status?.startsWith('rejected');
                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        {i > 0 && (
                          <div className={`absolute left-0 right-0 h-0.5 top-4 ${isDone && !isRejected ? 'bg-primary-500' : 'bg-gray-200'}`}
                            style={{ left: `${(i / (STEPS.length - 1)) * 50}%`, width: `${100 / (STEPS.length - 1)}%` }}
                          />
                        )}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${isDone && !isRejected ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {isDone && !isRejected ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                        </div>
                        <p className="text-xs text-center mt-1 text-gray-600">{step.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(latestApp.l1RejectionReason || latestApp.l2RejectionReason) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">Rejection Reason:</p>
                  <p className="text-sm text-red-600 mt-1">
                    {latestApp.l1RejectionReason || latestApp.l2RejectionReason}
                  </p>
                </div>
              )}

              {isApproved && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <Bus size={24} className="text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-green-800">Seat Confirmed!</p>
                    <p className="text-sm text-green-600">Route: {latestApp.routeName}</p>
                  </div>
                  <Link to={`${base}/bus-pass`} className="btn-primary flex-shrink-0 text-xs py-1.5 px-3">
                    View Bus Pass
                  </Link>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Link to={`${base}/status`} className="btn-outline text-xs">
                  View Full Details <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="card text-center py-12">
            <Bus size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-600 mb-2">No Application Yet</h3>
            <p className="text-sm text-gray-400 mb-6">Apply for a bus route to get started.</p>
            <Link to={`${base}/apply`} className="btn-primary inline-flex">
              <FileText size={16} /> Apply for Bus Pass
            </Link>
          </div>
        )}

        {!hasActiveApp && (
          <div className="card bg-primary-50 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-primary-800">Ready to apply?</h3>
                <p className="text-sm text-primary-600 mt-1">Select your route and boarding point</p>
              </div>
              <Link to={`${base}/apply`} className="btn-primary flex-shrink-0">
                Apply Now <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
