import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationsAPI, routesAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/helpers';
import { Users, MapPin, Bus, ArrowRight } from 'lucide-react';

export default function InchargeDashboard() {
  const { userProfile } = useAuth();

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

  const myStudents = (appsData?.data || []).filter(a => a.routeId === myRoute?.id);

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
