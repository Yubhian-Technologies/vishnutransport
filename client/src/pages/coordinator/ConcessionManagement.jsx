import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { concessionsAPI, routesAPI, boardingPointsAPI } from '../../utils/api';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { BadgePercent, Trash2, CheckCircle2, Clock, UserCheck } from 'lucide-react';

export default function ConcessionManagement() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ studentEmail: '', routeId: '', boardingPointId: '', concessionFee: '', reason: '' });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const { data: routes = [] } = useQuery({ queryKey: ['routes-all'], queryFn: () => routesAPI.getAll() });

  const { data: boardingPoints = [] } = useQuery({
    queryKey: ['boarding-points', form.routeId],
    queryFn: () => boardingPointsAPI.getByRoute(form.routeId),
    enabled: !!form.routeId,
  });

  const { data: concessions = [], isLoading } = useQuery({
    queryKey: ['concessions'],
    queryFn: concessionsAPI.getAll,
  });

  const grantMutation = useMutation({
    mutationFn: (data) => concessionsAPI.grant(data),
    onSuccess: () => {
      toast.success('Concession granted successfully');
      setForm({ studentEmail: '', routeId: '', boardingPointId: '', concessionFee: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: ['concessions'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => concessionsAPI.revoke(id),
    onSuccess: () => {
      toast.success('Concession revoked');
      queryClient.invalidateQueries({ queryKey: ['concessions'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.studentEmail.trim()) return toast.error('Student email is required');
    if (!form.routeId) return toast.error('Route is required');
    if (!form.boardingPointId) return toast.error('Boarding point is required');
    if (!form.concessionFee || Number(form.concessionFee) <= 0) return toast.error('Concession fee must be greater than 0');
    if (!form.reason.trim()) return toast.error('Reason is required');
    grantMutation.mutate({ ...form, concessionFee: Number(form.concessionFee) });
  };

  const selectedRoute = routes.find(r => r.id === form.routeId);
  const activeConcessions = concessions.filter(c => !c.used);
  const usedConcessions = concessions.filter(c => c.used);

  return (
    <Layout title="Fee Concession">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Grant form */}
        <div className="card">
          <h2 className="mb-1 flex items-center gap-2">
            <BadgePercent size={18} className="text-primary-600" /> Grant Fee Concession
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Grant a reduced fee for a specific student on a route. The concession reason will be shown to accounts during verification.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Student / Faculty Email *</label>
                <input
                  type="email"
                  value={form.studentEmail}
                  onChange={set('studentEmail')}
                  placeholder="student@example.com"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Route *</label>
                <select
                  value={form.routeId}
                  onChange={e => setForm(f => ({ ...f, routeId: e.target.value, boardingPointId: '' }))}
                  className="input"
                >
                  <option value="">-- Select Route --</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Boarding Point *</label>
                <select
                  value={form.boardingPointId}
                  onChange={set('boardingPointId')}
                  className="input"
                  disabled={!form.routeId}
                >
                  <option value="">-- Select Boarding Point --</option>
                  {boardingPoints.map(bp => (
                    <option key={bp.id} value={bp.id}>{bp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Concession Fee (₹) *</label>
                <input
                  type="number"
                  value={form.concessionFee}
                  onChange={set('concessionFee')}
                  placeholder="e.g. 15000"
                  min={1}
                  className="input"
                />
                {form.concessionFee && selectedRoute && (
                  <p className="text-xs text-gray-500 mt-1">
                    Student pays <span className="font-semibold text-primary-700">{formatCurrency(Number(form.concessionFee))}</span> instead of the route fare
                  </p>
                )}
              </div>
              <div>
                <label className="label">Reason *</label>
                <input
                  value={form.reason}
                  onChange={set('reason')}
                  placeholder="e.g. SC/ST category, merit scholarship…"
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">This reason is visible to accounts during payment verification.</p>
              </div>
            </div>
            <button type="submit" disabled={grantMutation.isPending} className="btn-primary">
              <UserCheck size={16} /> {grantMutation.isPending ? 'Granting…' : 'Grant Concession'}
            </button>
          </form>
        </div>

        {/* Active concessions */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Clock size={15} className="text-amber-500" /> Active Concessions
            {activeConcessions.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{activeConcessions.length}</span>
            )}
          </h3>
          {isLoading ? <LoadingSpinner /> : activeConcessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No active concessions</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeConcessions.map((c, idx) => (
                <div key={c.id} className="flex items-start justify-between py-3 gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{c.studentName || c.studentEmail}</p>
                      <p className="text-xs text-gray-400">{c.studentEmail}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {c.routeName} · {c.boardingPointName}
                      </p>
                      <p className="text-xs mt-0.5">
                        Fee: <span className="font-semibold text-primary-700">{formatCurrency(c.concessionFee)}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 italic">Reason: {c.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-xs text-gray-400 hidden sm:block">{formatDateTime(c.grantedAt)}</p>
                    <button
                      onClick={() => revokeMutation.mutate(c.id)}
                      disabled={revokeMutation.isPending}
                      className="p-1.5 rounded hover:bg-red-50 text-red-500"
                      title="Revoke"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Used concessions */}
        {usedConcessions.length > 0 && (
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-green-500" /> Used Concessions
            </h3>
            <div className="divide-y divide-gray-100">
              {usedConcessions.map((c, idx) => (
                <div key={c.id} className="flex items-start justify-between py-3 opacity-70 gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{c.studentName || c.studentEmail}</p>
                      <p className="text-xs text-gray-400">{c.studentEmail}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{c.routeName} · {c.boardingPointName}</p>
                      <p className="text-xs mt-0.5">Fee: <span className="font-semibold">{formatCurrency(c.concessionFee)}</span></p>
                      <p className="text-xs text-gray-500 mt-0.5 italic">Reason: {c.reason}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Used</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}