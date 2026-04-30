import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationsAPI, routesAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Bus, Printer, ArrowLeft, Phone, Truck, UserCog } from 'lucide-react';
import { format } from 'date-fns';

export default function BusPass() {
  const { userProfile, role, currentUser } = useAuth();
  const base = role === 'faculty' ? '/faculty' : '/student';
  const passRef = useRef(null);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: applicationsAPI.getMy,
  });

  const app = apps.find(a => a.status === 'approved_final');
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: routeDetails } = useQuery({
    queryKey: ['route-details', app?.routeId],
    queryFn: () => routesAPI.get(app.routeId),
    enabled: !!app?.routeId,
  });

  const qrData = JSON.stringify({
    uid: currentUser?.uid,
    date: today,
    name: userProfile?.name,
    route: app?.routeName,
  });

  const handlePrint = () => window.print();

  if (isLoading) return <Layout title="Bus Pass"><LoadingSpinner /></Layout>;

  if (!app) {
    return (
      <Layout title="Bus Pass">
        <div className="card text-center py-12">
          <Bus size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No Confirmed Seat</h3>
          <p className="text-sm text-gray-400 mb-4">Your bus pass will be available once your seat is confirmed.</p>
          <Link to={base} className="btn-primary inline-flex">Back to Dashboard</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Bus Pass">
      {/* Print styles injected into head */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #bus-pass-card, #bus-pass-card * { visibility: visible !important; }
          #bus-pass-card {
            position: fixed !important;
            top: 0; left: 0;
            width: 100vw;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 24px;
          }
        }
      `}</style>

      <div className="max-w-md mx-auto space-y-4">
        {/* Actions */}
        <div className="flex items-center justify-between no-print">
          <Link to={base} className="btn-secondary text-sm flex items-center gap-2">
            <ArrowLeft size={15} /> Dashboard
          </Link>
          <button onClick={handlePrint} className="btn-primary text-sm flex items-center gap-2">
            <Printer size={15} /> Print / Save as PDF
          </button>
        </div>

        {/* Bus Pass Card */}
        <div
          id="bus-pass-card"
          ref={passRef}
          className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 w-full max-w-sm mx-auto"
        >
          {/* Header */}
          <div className="bg-primary-700 px-5 py-4 text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Bus size={20} />
              <span className="text-xs font-semibold uppercase tracking-widest">College Bus Pass</span>
            </div>
            <p className="text-sm font-bold truncate">{userProfile?.college || app.college}</p>
            <p className="text-xs text-primary-200 mt-0.5">Valid: {format(new Date(), 'MMMM yyyy')}</p>
          </div>

          {/* Profile section */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
            <div className="flex-shrink-0">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 border-2 border-primary-200 flex items-center justify-center text-primary-700 text-3xl font-bold">
                  {userProfile?.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-base leading-tight">{userProfile?.name || app.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{app.regNo}</p>
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-gray-600"><span className="font-medium">Branch:</span> {app.branch}</p>
                {(userProfile?.academicYear || app.academicYear) && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Year:</span> {userProfile?.academicYear || app.academicYear}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Phone:</span> {userProfile?.studentPhone || userProfile?.phone || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Route info */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div>
                <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Route</p>
                <p className="font-semibold text-gray-800">{app.routeName}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Boarding Point</p>
                <p className="font-semibold text-gray-800">{app.boardingPointName}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Blood Group</p>
                <p className="font-bold text-red-600">{userProfile?.bloodGroup || app.bloodGroup || '—'}</p>
              </div>
            </div>
          </div>

          {/* Driver & Incharge contact */}
          {routeDetails && (routeDetails.driverName || routeDetails.inchargeName) && (
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Bus Contacts</p>
              <div className="grid grid-cols-2 gap-2">
                {routeDetails.driverName && (
                  <div className="flex items-start gap-2">
                    <Truck size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Driver</p>
                      <p className="text-xs font-semibold text-gray-800">{routeDetails.driverName}</p>
                      {routeDetails.driverPhone && (
                        <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                          <Phone size={9} /> {routeDetails.driverPhone}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {routeDetails.inchargeName && (
                  <div className="flex items-start gap-2">
                    <UserCog size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Incharge</p>
                      <p className="text-xs font-semibold text-gray-800">{routeDetails.inchargeName}</p>
                      {routeDetails.inchargePhone && (
                        <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                          <Phone size={9} /> {routeDetails.inchargePhone}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QR Code for attendance */}
          <div className="px-5 py-4 flex flex-col items-center gap-2">
            <QRCodeSVG
              value={qrData}
              size={110}
              level="M"
              includeMargin={false}
            />
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Scan for Attendance</p>
            <p className="text-[10px] text-gray-400">{today}</p>
          </div>

          {/* Footer */}
          <div className="bg-primary-700 px-5 py-2 text-center">
            <p className="text-[10px] text-primary-200 uppercase tracking-widest">
              This pass is non-transferable
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 no-print">
          The QR code updates daily and is used for bus attendance.
        </p>
      </div>
    </Layout>
  );
}
