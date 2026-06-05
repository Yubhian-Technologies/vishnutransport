import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationsAPI, routesAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/helpers';
import { Users, MapPin, Bus, ArrowRight, CreditCard, Upload, CheckCircle2, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DUE_STATUS_UI = {
  pending_upload:       { label: 'Payment Pending',      color: 'text-amber-600 bg-amber-50',   icon: Clock },
  pending_verification: { label: 'Under Verification',   color: 'text-blue-600 bg-blue-50',     icon: Clock },
  verified:             { label: 'Payment Verified',      color: 'text-green-600 bg-green-50',   icon: CheckCircle2 },
  rejected:             { label: 'Payment Rejected',      color: 'text-red-600 bg-red-50',       icon: XCircle },
};

export default function InchargeDashboard() {
  const { userProfile } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef();
  const [utr, setUtr] = useState('');
  const [file, setFile] = useState(null);

  const { data: allRoutes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: () => routesAPI.getAll({ includeOccupancy: 'true' }),
  });

  const myRoute = allRoutes.find(r => r.inchargeId === userProfile?.uid);

  const { data: appsData, isLoading } = useQuery({
    queryKey: ['applications', 'approved_final'],
    queryFn: () => applicationsAPI.getAll({ status: 'approved_final' }),
    enabled: !!myRoute,
  });

  const { data: myApps = [] } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => applicationsAPI.getMy(),
  });
  const myInchargeApp = myApps.find(a => a.applicantRole === 'bus_incharge');

  const submitFee = useMutation({
    mutationFn: () => applicationsAPI.submitDuePayment(myInchargeApp.id, file, utr),
    onSuccess: () => {
      toast.success('Fee payment submitted for verification');
      setFile(null);
      setUtr('');
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: e => toast.error(e?.response?.data?.error || e.message),
  });

  const myStudents = (appsData?.data || []).filter(a => a.routeId === myRoute?.id && a.applicantRole !== 'bus_incharge');

  return (
    <Layout title="Bus Incharge Dashboard">
      <div className="space-y-6">
        {!myRoute ? (
          <div className="card text-center py-12">
            <Bus size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-600">No Route Assigned</h3>
            <p className="text-sm text-gray-400 mt-2">Contact your Bus Coordinator to get assigned to a route.</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
              <p className="text-blue-100 text-sm">Your Assigned Route</p>
              <h2 className="text-2xl font-bold mt-1">{myRoute.routeName}</h2>
              <p className="text-blue-100 mt-1">{myRoute.startPoint} → {myRoute.endPoint}</p>
              {myRoute.busNumber && <p className="text-blue-200 text-sm mt-2">Bus: {myRoute.busNumber}</p>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Seats', value: myRoute.seatCapacity, icon: Bus },
                { label: 'Occupied', value: myRoute.occupiedSeats, icon: Users },
                { label: 'Available', value: myRoute.availableSeats, icon: MapPin },
                { label: 'Occupancy', value: `${myRoute.seatCapacity > 0 ? Math.round((myRoute.occupiedSeats / myRoute.seatCapacity) * 100) : 0}%`, icon: Bus },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="stat-card">
                  <Icon size={20} className="text-primary-600 mb-2" />
                  <p className="stat-value">{value}</p>
                  <p className="stat-label">{label}</p>
                </div>
              ))}
            </div>

            {myInchargeApp && (() => {
              const ds = myInchargeApp.dueStatus;
              const ui = DUE_STATUS_UI[ds] || DUE_STATUS_UI.pending_upload;
              const StatusIcon = ui.icon;
              const canUpload = ds === 'pending_upload' || ds === 'rejected';
              return (
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard size={18} className="text-primary-600" />
                    <h2 className="mb-0">My Bus Fee</h2>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Amount Due (50% concession applied)</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(myInchargeApp.dueAmount)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Full fare: {formatCurrency(myInchargeApp.fullFare)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${ui.color}`}>
                      <StatusIcon size={13} />
                      {ui.label}
                    </span>
                  </div>
                  {ds === 'rejected' && myInchargeApp.dueRejectionReason && (
                    <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
                      Rejected: {myInchargeApp.dueRejectionReason}
                    </div>
                  )}
                  {ds === 'pending_verification' && (
                    <p className="text-xs text-blue-600 mb-3">Your payment proof has been submitted and is under review.</p>
                  )}
                  {ds === 'verified' && (
                    <p className="text-xs text-green-600 mb-3">Your fee payment has been verified. Thank you!</p>
                  )}
                  {canUpload && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">Submit Payment Proof</p>
                      <input
                        type="text"
                        placeholder="UTR / Transaction Number"
                        value={utr}
                        onChange={e => setUtr(e.target.value)}
                        className="input text-sm"
                      />
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={e => setFile(e.target.files[0] || null)}
                        className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      />
                      <button
                        onClick={() => submitFee.mutate()}
                        disabled={!file || submitFee.isPending}
                        className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2"
                      >
                        <Upload size={15} />
                        {submitFee.isPending ? 'Submitting…' : 'Submit Payment'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2>Occupancy Status</h2>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div
                  className={`h-4 rounded-full transition-all ${myRoute.occupiedSeats / myRoute.seatCapacity >= 0.9 ? 'bg-red-500' : myRoute.occupiedSeats / myRoute.seatCapacity >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, myRoute.seatCapacity > 0 ? (myRoute.occupiedSeats / myRoute.seatCapacity) * 100 : 0)}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{myRoute.occupiedSeats} of {myRoute.seatCapacity} seats filled</p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2>Student Summary</h2>
                <Link to="/incharge/students" className="btn-outline text-xs">
                  View All <ArrowRight size={13} />
                </Link>
              </div>
              {isLoading ? <LoadingSpinner size="sm" /> : (
                <div className="space-y-2">
                  {myStudents.slice(0, 5).map(student => (
                    <div key={student.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-gray-400">{student.regNo} · {student.boardingPointName}</p>
                      </div>
                    </div>
                  ))}
                  {myStudents.length > 5 && (
                    <p className="text-xs text-gray-400 text-center pt-2">+{myStudents.length - 5} more students</p>
                  )}
                </div>
              )}
            </div>

            {myRoute.boardingPoints?.length > 0 && (
              <div className="card">
                <h2 className="mb-4">Boarding Points</h2>
                <div className="space-y-2">
                  {myRoute.boardingPoints.map((bp, i) => (
                    <div key={bp.id} className="flex items-center gap-3 py-2">
                      <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                      <div>
                        <p className="font-medium text-sm">{bp.name}</p>
                        {bp.timings && <p className="text-xs text-gray-400">{bp.timings}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
