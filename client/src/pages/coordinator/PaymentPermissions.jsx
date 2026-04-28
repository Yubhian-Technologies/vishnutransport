import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { partialPermissionsAPI } from '../../utils/api';
import { formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { ShieldCheck, Trash2, CheckCircle2, Clock, UserCheck } from 'lucide-react';

export default function PaymentPermissions() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [percentage, setPercentage] = useState('');
  const [granting, setGranting] = useState(false);

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['partial-permissions'],
    queryFn: partialPermissionsAPI.getAll,
  });

  const grantMutation = useMutation({
    mutationFn: (data) => partialPermissionsAPI.grant(data),
    onSuccess: () => {
      toast.success('Partial payment permission granted');
      setEmail('');
      setPercentage('');
      queryClient.invalidateQueries({ queryKey: ['partial-permissions'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => partialPermissionsAPI.revoke(id),
    onSuccess: () => {
      toast.success('Permission revoked');
      queryClient.invalidateQueries({ queryKey: ['partial-permissions'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleGrant = (e) => {
    e.preventDefault();
    const pct = Number(percentage);
    if (!email.trim()) return toast.error('Student email is required');
    if (isNaN(pct) || pct <= 0 || pct >= 100) return toast.error('Percentage must be between 1 and 99');
    grantMutation.mutate({ studentEmail: email.trim(), percentage: pct });
  };

  const unusedPerms = permissions.filter(p => !p.used);
  const usedPerms = permissions.filter(p => p.used);

  return (
    <Layout title="Partial Payment Permissions">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Grant form */}
        <div className="card">
          <h2 className="mb-1 flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary-600" /> Grant Partial Payment
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            The student will pay the specified percentage of the total fare now; the remaining amount becomes due after approval.
          </p>
          <form onSubmit={handleGrant} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Student Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Pay Now Percentage (%) *</label>
                <input
                  type="number"
                  value={percentage}
                  onChange={e => setPercentage(e.target.value)}
                  placeholder="e.g. 60 (student pays 60% now)"
                  min={1}
                  max={99}
                  className="input"
                  required
                />
                {percentage && Number(percentage) > 0 && Number(percentage) < 100 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Student pays {percentage}% now · {100 - Number(percentage)}% becomes due
                  </p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={grantMutation.isPending}
              className="btn-primary"
            >
              <UserCheck size={16} /> {grantMutation.isPending ? 'Granting…' : 'Grant Permission'}
            </button>
          </form>
        </div>

        {/* Active (unused) permissions */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Clock size={15} className="text-amber-500" /> Pending Permissions
            {unusedPerms.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {unusedPerms.length}
              </span>
            )}
          </h3>

          {isLoading ? <LoadingSpinner /> : unusedPerms.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No pending permissions</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {unusedPerms.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{p.studentName || p.studentEmail}</p>
                      <p className="text-xs text-gray-400">{p.studentEmail}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Pay <span className="font-semibold text-primary-700">{p.percentage}%</span> now ·{' '}
                        <span className="text-gray-400">{100 - p.percentage}% due later</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-400 hidden sm:block">{formatDateTime(p.grantedAt)}</p>
                    <button
                      onClick={() => revokeMutation.mutate(p.id)}
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

        {/* Used permissions */}
        {usedPerms.length > 0 && (
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-green-500" /> Used Permissions
            </h3>
            <div className="divide-y divide-gray-100">
              {usedPerms.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between py-3 opacity-70">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{p.studentName || p.studentEmail}</p>
                      <p className="text-xs text-gray-400">{p.studentEmail}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.percentage}% paid upfront · {100 - p.percentage}% due
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Used
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
