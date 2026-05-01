import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { usersAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Eye, X, Loader2, ShieldCheck } from 'lucide-react';

export default function GuestManagement() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guest-users'],
    queryFn: usersAPI.getGuests,
  });

  const deleteMutation = useMutation({
    mutationFn: usersAPI.deleteGuest,
    onSuccess: () => {
      toast.success('Guest access revoked');
      qc.invalidateQueries(['guest-users']);
    },
    onError: (err) => toast.error(err.message || 'Failed to revoke access'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await usersAPI.create({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: 'guest' });
      toast.success('Guest user created successfully');
      setForm({ name: '', email: '', password: '' });
      setShowModal(false);
      qc.invalidateQueries(['guest-users']);
    } catch (err) {
      toast.error(err.message || 'Failed to create guest user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (guest) => {
    if (!window.confirm(`Revoke guest access for ${guest.name}? This cannot be undone.`)) return;
    deleteMutation.mutate(guest.id);
  };

  return (
    <Layout title="Guest Access">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Guests can view all transport data in read-only mode.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <UserPlus size={16} /> Add Guest
          </button>
        </div>

        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <LoadingSpinner />
          ) : guests.length === 0 ? (
            <div className="py-16 text-center">
              <Eye size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">No guest users yet</p>
              <p className="text-gray-400 text-xs mt-1">Add a guest to give read-only access to transport data.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Added</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g, i) => (
                  <tr key={g.id}>
                    <td className="text-gray-400 text-xs">{i + 1}</td>
                    <td className="font-medium text-gray-900">{g.name}</td>
                    <td className="text-gray-600">{g.email}</td>
                    <td className="text-gray-400 text-xs">
                      {g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <span className={`badge ${g.disabled ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {g.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(g)}
                        disabled={deleteMutation.isPending}
                        className="btn-danger py-1 px-2 text-xs"
                        title="Revoke access"
                      >
                        <Trash2 size={13} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <ShieldCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Guests can view dashboards, analytics, route occupancy, fee summaries, and attendance data.
            They cannot approve applications, manage routes, or make any changes.
          </p>
        </div>
      </div>

      {/* Add Guest Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Add Guest User</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="Guest's full name" className="input" required />
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input value={form.email} onChange={set('email')} type="email" placeholder="guest@example.com" className="input" required />
              </div>
              <div>
                <label className="label">Password *</label>
                <input value={form.password} onChange={set('password')} type="password" placeholder="Min. 6 characters" className="input" required />
              </div>
              <p className="text-xs text-gray-400">The guest will log in using these credentials and get read-only access.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <><Loader2 size={15} className="animate-spin" /> Creating...</> : 'Create Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
