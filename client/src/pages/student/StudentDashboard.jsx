import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationsAPI, routesAPI, publicAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatCurrency, STATUS_LABELS } from '../../utils/helpers';
import { FileText, ArrowRight, Bus, MapPin, CheckCircle2, Clock, UserCircle, Phone, UserCog, Truck, AlarmClock, MapPinned, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const TRACK_STAGES = [
  { label: 'Submitted', dot: 'bg-amber-500', ring: 'ring-amber-300', text: 'text-amber-600' },
  { label: 'Coordinator', dot: 'bg-blue-500', ring: 'ring-blue-300', text: 'text-blue-600' },
  { label: 'Accounts', dot: 'bg-purple-500', ring: 'ring-purple-300', text: 'text-purple-600' },
  { label: 'Confirmed', dot: 'bg-green-500', ring: 'ring-green-300', text: 'text-green-600' },
];

const STATUS_TO_STAGE = {
  pending_coordinator: { busIdx: 0, done: 1, rejectedAt: -1 },
  rejected_l1:        { busIdx: 1, done: 1, rejectedAt: 1 },
  pending_accounts:   { busIdx: 1, done: 2, rejectedAt: -1 },
  rejected_l2:        { busIdx: 2, done: 2, rejectedAt: 2 },
  approved_final:     { busIdx: 3, done: 4, rejectedAt: -1 },
};

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

  const { data: routeDetails } = useQuery({
    queryKey: ['route-details', latestApp?.routeId],
    queryFn: () => routesAPI.get(latestApp.routeId),
    enabled: isApproved && !!latestApp?.routeId,
  });

  const { data: publicConfig } = useQuery({
    queryKey: ['public-config'],
    queryFn: publicAPI.getConfig,
    staleTime: 5 * 60 * 1000,
    enabled: isApproved,
  });
  const hasLoconav = isApproved && (publicConfig?.loconavPlayStore || publicConfig?.loconavAppStore);

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
                  { label: latestApp.paymentType === 'concession' ? 'Concession Fare' : 'Fare', value: formatCurrency(latestApp.fare) },
                  { label: 'Submitted', value: formatDate(latestApp.submittedAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium text-gray-800 mt-0.5 text-sm">{value}</p>
                  </div>
                ))}
              </div>

              {/* Tracking Bar */}
              {(() => {
                const { busIdx, done: stagesDone, rejectedAt } = STATUS_TO_STAGE[latestApp.status] ?? { busIdx: 0, done: 1, rejectedAt: -1 };
                const isRej = rejectedAt >= 0;
                return (
                  <div className="relative pt-1">
                    {/* Grid: 4 cols for bus emoji row, dot row, label row */}
                    <div className="relative grid grid-cols-4">
                      {/* Bus emoji row */}
                      {TRACK_STAGES.map((_, i) => (
                        <div key={i} className="flex justify-center h-8 items-end pb-1">
                          {i === busIdx && (
                            <span className="text-2xl leading-none" style={{ transform: 'scaleX(-1)' }}>🚌</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Track line (absolute, behind dots) — top aligns with dot centers (4px pt-1 + 32px bus row + 14px half-dot = 50px) */}
                    <div className="absolute left-[12.5%] right-[12.5%] h-1.5 bg-gray-200 rounded-full" style={{ top: 50 }} />
                    {busIdx > 0 && (
                      <div
                        className={`absolute left-[12.5%] h-1.5 rounded-full transition-all duration-700 ${isRej ? 'bg-red-400' : 'bg-gradient-to-r from-amber-400 via-blue-400 to-green-500'}`}
                        style={{ top: 50, width: `${busIdx * 25}%` }}
                      />
                    )}

                    {/* Dots row */}
                    <div className="relative grid grid-cols-4">
                      {TRACK_STAGES.map((stage, i) => {
                        const isDone = i < stagesDone;
                        const isRejHere = i === rejectedAt;
                        const isCurrent = i === busIdx && !isRej;
                        return (
                          <div key={i} className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${
                              isRejHere ? 'bg-red-500' :
                              isDone || isCurrent ? stage.dot : 'bg-gray-200'
                            } ${isCurrent ? `ring-4 ${stage.ring}` : ''}`}>
                              {isRejHere ? (
                                <span className="text-white text-xs font-bold">✕</span>
                              ) : isDone ? (
                                <span className="text-white text-xs font-bold">✓</span>
                              ) : (
                                <span className="text-gray-400 text-xs font-bold">{i + 1}</span>
                              )}
                            </div>
                            <p className={`text-xs text-center mt-1.5 font-medium leading-tight ${
                              isRejHere ? 'text-red-500' :
                              isDone || isCurrent ? stage.text : 'text-gray-400'
                            }`}>
                              {stage.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {latestApp.paymentType === 'concession' && latestApp.concessionReason && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">Fee Concession Applied</p>
                  <p className="text-xs text-green-700 mt-0.5">Reason: {latestApp.concessionReason}</p>
                </div>
              )}

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

            {isApproved && routeDetails?.stops?.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <AlarmClock size={15} className="text-indigo-500" /> Bus Schedule
                </h3>
                <div className="relative">
                  <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-indigo-100" />
                  <div className="space-y-3">
                    {routeDetails.stops.map((stop, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center flex-shrink-0 z-10">
                          <span className="text-xs font-bold text-indigo-600">{i + 1}</span>
                        </div>
                        <div className="flex-1 flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-sm font-medium text-gray-800">{stop.name}</p>
                          {stop.time && (
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded ml-2 flex-shrink-0">
                              {stop.time}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isApproved && routeDetails && (routeDetails.driverName || routeDetails.inchargeName) && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Bus Contact Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {routeDetails.driverName && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Truck size={18} className="text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Driver</p>
                        <p className="font-semibold text-gray-800 text-sm mt-0.5">{routeDetails.driverName}</p>
                        {routeDetails.driverPhone && (
                          <a href={`tel:${routeDetails.driverPhone}`} className="flex items-center gap-1 text-xs text-amber-700 hover:underline mt-0.5">
                            <Phone size={11} /> {routeDetails.driverPhone}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {routeDetails.inchargeName && (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <UserCog size={18} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Bus Incharge</p>
                        <p className="font-semibold text-gray-800 text-sm mt-0.5">{routeDetails.inchargeName}</p>
                        {routeDetails.inchargePhone && (
                          <a href={`tel:${routeDetails.inchargePhone}`} className="flex items-center gap-1 text-xs text-blue-700 hover:underline mt-0.5">
                            <Phone size={11} /> {routeDetails.inchargePhone}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {hasLoconav && (
              <div className="card border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <MapPinned size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-0">Track Your Bus</h3>
                    <p className="text-xs text-gray-500">Live GPS tracking via LocoNav app</p>
                  </div>
                </div>

                {(publicConfig?.loconavEmail || publicConfig?.loconavPassword) && (
                  <div className="bg-white border border-indigo-100 rounded-xl p-3 mb-4 space-y-2">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">App Login Credentials</p>
                    {publicConfig.loconavEmail && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-400">Username / Email</p>
                          <p className="text-sm font-mono font-medium text-gray-800">{publicConfig.loconavEmail}</p>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(publicConfig.loconavEmail); toast.success('Email copied'); }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    )}
                    {publicConfig.loconavPassword && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-400">Password</p>
                          <p className="text-sm font-mono font-medium text-gray-800">{publicConfig.loconavPassword}</p>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(publicConfig.loconavPassword); toast.success('Password copied'); }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {publicConfig?.loconavPlayStore && (
                    <a
                      href={publicConfig.loconavPlayStore}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M3.18 23.76c.3.17.65.18.96.03L14.77 12 3.12.22c-.3-.16-.66-.15-.96.03C1.76.59 1.5 1.04 1.5 1.52v20.96c0 .48.26.93.68 1.28zM16.34 13.6l2.55-1.47-2.83-2.83-2.27 2.27 2.55 1.47zm-1.57.9L3.66 20.95l9.56-9.57 1.55.89zm1.57-5.2-1.55.89-1.55-.89L3.66 3.05 15.34 9.5l2.55 1.47-1.55.89z"/></svg>
                      Google Play
                    </a>
                  )}
                  {publicConfig?.loconavAppStore && (
                    <a
                      href={publicConfig.loconavAppStore}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                      App Store
                    </a>
                  )}
                </div>
              </div>
            )}
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
