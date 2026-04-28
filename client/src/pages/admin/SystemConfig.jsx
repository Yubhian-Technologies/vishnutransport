import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { collegesAPI, routesAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Settings, Building2, Route, RefreshCw, Database, Shield } from 'lucide-react';

export default function SystemConfig() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: colleges = [] } = useQuery({ queryKey: ['colleges'], queryFn: collegesAPI.getAll });
  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: () => routesAPI.getAll({ includeOccupancy: 'true' }),
  });

  const TABS = [
    { id: 'overview', label: 'System Overview', icon: Database },
    { id: 'colleges', label: 'Colleges', icon: Building2 },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'security', label: 'Access Control', icon: Shield },
  ];

  return (
    <Layout title="System Configuration">
      <div className="space-y-5">
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Colleges', value: colleges.length, icon: Building2, color: 'bg-purple-50 text-purple-600' },
                { label: 'Routes', value: routes.length, icon: Route, color: 'bg-blue-50 text-blue-600' },
                { label: 'Total Capacity', value: routes.reduce((s, r) => s + (r.seatCapacity || 0), 0), icon: Database, color: 'bg-green-50 text-green-600' },
                { label: 'Occupied Seats', value: routes.reduce((s, r) => s + (r.occupiedSeats || 0), 0), icon: Settings, color: 'bg-orange-50 text-orange-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card">
                  <div className={`p-2.5 rounded-lg w-fit ${color} mb-3`}><Icon size={18} /></div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="card">
              <h2 className="mb-4">System Health</h2>
              <div className="space-y-3">
                {[
                  { label: 'Firebase Authentication', status: 'Connected', ok: true },
                  { label: 'Firestore Database', status: 'Active', ok: true },
                  { label: 'Firebase Storage', status: 'Available', ok: true },
                  { label: 'API Server', status: 'Running', ok: true },
                ].map(({ label, status, ok }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{label}</span>
                    <span className={`badge ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => { queryClient.invalidateQueries(); toast.success('Cache cleared'); }} className="btn-secondary text-sm">
                  <RefreshCw size={14} /> Clear Query Cache
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'colleges' && (
          <div className="card">
            <h2 className="mb-4">All Colleges ({colleges.length})</h2>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>College Name</th><th>City</th><th>Contact</th><th>QR Code</th><th>Bank Details</th></tr>
                </thead>
                <tbody>
                  {colleges.map(c => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.name}</td>
                      <td className="text-sm text-gray-500">{c.city}{c.state ? `, ${c.state}` : ''}</td>
                      <td className="text-sm text-gray-500">{c.contactEmail || '—'}</td>
                      <td><span className={`badge ${c.qrCodeUrl ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.qrCodeUrl ? 'Uploaded' : 'Missing'}</span></td>
                      <td><span className={`badge ${c.bankDetails ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.bankDetails ? 'Set' : 'Missing'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'routes' && (
          <div className="card">
            <h2 className="mb-4">All Routes ({routes.length})</h2>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Route</th><th>Number</th><th>Capacity</th><th>Fare</th><th>Incharge</th><th>Occupancy</th></tr>
                </thead>
                <tbody>
                  {routes.map(r => (
                    <tr key={r.id}>
                      <td>
                        <p className="font-medium">{r.routeName}</p>
                        <p className="text-xs text-gray-400">{r.startPoint} → {r.endPoint}</p>
                      </td>
                      <td className="text-sm">{r.routeNumber || '—'}</td>
                      <td>{r.seatCapacity}</td>
                      <td>{formatCurrency(r.fare)}</td>
                      <td><span className={`badge ${r.inchargeId ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.inchargeId ? 'Assigned' : 'None'}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${(r.occupiedSeats / r.seatCapacity) >= 0.9 ? 'bg-red-500' : (r.occupiedSeats / r.seatCapacity) >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${r.seatCapacity > 0 ? (r.occupiedSeats / r.seatCapacity) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs">{r.seatCapacity > 0 ? Math.round((r.occupiedSeats / r.seatCapacity) * 100) : 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card">
            <h2 className="mb-4">Role-Based Access Control</h2>
            <div className="space-y-4">
              {[
                {
                  role: 'Super Admin',
                  color: 'bg-purple-100 text-purple-800',
                  permissions: ['Full system access', 'User management (all roles)', 'System configuration', 'All coordinator & accounts features'],
                },
                {
                  role: 'Bus Coordinator',
                  color: 'bg-blue-100 text-blue-800',
                  permissions: ['Manage colleges (QR, bank details)', 'Manage routes & boarding points', 'Level 1 application review', 'Analytics & occupancy reports'],
                },
                {
                  role: 'Accounts',
                  color: 'bg-green-100 text-green-800',
                  permissions: ['Level 2 payment verification', 'Confirm or reject payments', 'Financial reports & revenue data', 'CSV/PDF export'],
                },
                {
                  role: 'Bus Incharge',
                  color: 'bg-orange-100 text-orange-800',
                  permissions: ['View assigned route students', 'Monitor seat occupancy', 'View boarding points', 'Export student list'],
                },
                {
                  role: 'Student',
                  color: 'bg-gray-100 text-gray-800',
                  permissions: ['Submit bus application', 'Upload payment proof', 'View application status', 'Track verification steps'],
                },
              ].map(({ role, color, permissions }) => (
                <div key={role} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`badge ${color} font-semibold`}>{role}</span>
                  </div>
                  <ul className="space-y-1">
                    {permissions.map(p => (
                      <li key={p} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
