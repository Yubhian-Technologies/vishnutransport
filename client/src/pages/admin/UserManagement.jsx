import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { usersAPI } from '../../utils/api';
import { ROLE_LABELS, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Search, UserCheck, UserX, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';

const ROLES = ['super_admin', 'bus_coordinator', 'accounts', 'bus_incharge', 'student', 'faculty'];

const ROLE_BADGE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700',
  bus_coordinator: 'bg-blue-100 text-blue-700',
  accounts: 'bg-green-100 text-green-700',
  bus_incharge: 'bg-orange-100 text-orange-700',
  student: 'bg-gray-100 text-gray-700',
  faculty: 'bg-teal-100 text-teal-700',
};

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: () => usersAPI.getAll({ role: roleFilter || undefined }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ shouldUnregister: true });

  const createMutation = useMutation({
    mutationFn: usersAPI.create,
    onSuccess: () => { toast.success('User created'); setCreateModal(false); reset(); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: e => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => { toast.success('User updated'); setEditUser(null); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: usersAPI.delete,
    onSuccess: () => { toast.success('User deleted'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: e => toast.error(e.message),
  });

  const toggleDisable = (user) => {
    updateMutation.mutate({ id: user.id || user.uid, data: { disabled: !user.disabled } });
    toast.success(user.disabled ? 'User enabled' : 'User disabled');
  };

  const openEdit = (user) => {
    setEditUser(user);
    reset({ name: user.name, email: user.email, phone: user.phone || '', role: user.role });
  };

  const users = (data?.data || []).filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="User Management">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="input pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-44">
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <button onClick={() => { reset({ name: '', email: '', phone: '', role: '', password: '' }); setCreateModal(true); }} className="btn-primary ml-auto">
            <Plus size={16} /> Add User
          </button>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No users found</td></tr>
                ) : users.map(user => (
                  <tr key={user.id || user.uid}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">{user.phone || '—'}</td>
                    <td className="text-xs text-gray-500">{formatDate(user.createdAt)}</td>
                    <td>
                      <span className={`badge ${user.disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {user.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(user)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Edit">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => toggleDisable(user)} className={`p-1.5 rounded ${user.disabled ? 'hover:bg-green-50 text-green-600' : 'hover:bg-yellow-50 text-yellow-600'}`} title={user.disabled ? 'Enable' : 'Disable'}>
                          {user.disabled ? <UserCheck size={14} /> : <UserX size={14} />}
                        </button>
                        <button onClick={() => setDeleteTarget(user.id || user.uid)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
              Showing {users.length} of {data?.total || 0} users
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={createModal || !!editUser} onClose={() => { setCreateModal(false); setEditUser(null); reset(); }} title={editUser ? 'Edit User' : 'Create User'}>
        <form onSubmit={handleSubmit(data => editUser ? updateMutation.mutate({ id: editUser.id || editUser.uid, data }) : createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input {...register('name', { required: 'Required' })} className="input" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email Address *</label>
            <input {...register('email', { required: 'Required' })} type="email" className="input" disabled={!!editUser} />
          </div>
          {!editUser && (
            <div>
              <label className="label">Password *</label>
              <input {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })} type="password" className="input" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          )}
          <div>
            <label className="label">Phone</label>
            <input {...register('phone')} type="tel" className="input" />
          </div>
          <div>
            <label className="label">Role *</label>
            <select {...register('role', { required: 'Required' })} className="input">
              <option value="">-- Select Role --</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setCreateModal(false); setEditUser(null); reset(); }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1">
              {editUser ? 'Update' : 'Create'} User
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete User"
        message="Are you sure you want to permanently delete this user? This cannot be undone."
        confirmLabel="Delete User"
        danger
      />
    </Layout>
  );
}
