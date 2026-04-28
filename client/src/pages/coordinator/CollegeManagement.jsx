import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { collegesAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, QrCode, CreditCard, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function CollegeManagement() {
  const queryClient = useQueryClient();
  const [addModal, setAddModal] = useState(false);
  const [editCollege, setEditCollege] = useState(null);
  const [bankModal, setBankModal] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [qrFile, setQrFile] = useState(null);

  const { data: colleges = [], isLoading } = useQuery({ queryKey: ['colleges'], queryFn: collegesAPI.getAll });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const { register: regBank, handleSubmit: handleBank, reset: resetBank } = useForm();

  const createMutation = useMutation({
    mutationFn: collegesAPI.create,
    onSuccess: () => { toast.success('College created'); setAddModal(false); reset(); queryClient.invalidateQueries({ queryKey: ['colleges'] }); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => collegesAPI.update(id, data),
    onSuccess: () => { toast.success('College updated'); setEditCollege(null); queryClient.invalidateQueries({ queryKey: ['colleges'] }); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: collegesAPI.delete,
    onSuccess: () => { toast.success('College deleted'); queryClient.invalidateQueries({ queryKey: ['colleges'] }); },
    onError: (e) => toast.error(e.message),
  });

  const bankMutation = useMutation({
    mutationFn: ({ id, data }) => collegesAPI.updateBank(id, data),
    onSuccess: () => { toast.success('Bank details saved'); setBankModal(null); queryClient.invalidateQueries({ queryKey: ['colleges'] }); },
    onError: (e) => toast.error(e.message),
  });

  const qrMutation = useMutation({
    mutationFn: ({ id, file }) => collegesAPI.uploadQR(id, file),
    onSuccess: () => { toast.success('QR code uploaded'); setQrModal(null); setQrFile(null); queryClient.invalidateQueries({ queryKey: ['colleges'] }); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (college) => {
    setEditCollege(college);
    Object.entries(college).forEach(([k, v]) => setValue(k, v));
  };

  return (
    <Layout title="College Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{colleges.length} college{colleges.length !== 1 ? 's' : ''} registered</p>
          <button onClick={() => { reset(); setAddModal(true); }} className="btn-primary">
            <Plus size={16} /> Add College
          </button>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {colleges.map(college => (
              <div key={college.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Building2 size={20} className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{college.name}</h3>
                      <p className="text-xs text-gray-500">{college.city}{college.state ? `, ${college.state}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(college)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
                      <Edit size={15} />
                    </button>
                    <button onClick={() => setDeleteTarget(college.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => setQrModal(college)} className={`btn text-xs py-1.5 ${college.qrCodeUrl ? 'btn-secondary' : 'btn-outline'}`}>
                    <QrCode size={13} /> {college.qrCodeUrl ? 'Update QR' : 'Upload QR'}
                  </button>
                  <button onClick={() => { setBankModal(college); resetBank(college.bankDetails || {}); }} className={`btn text-xs py-1.5 ${college.bankDetails ? 'btn-secondary' : 'btn-outline'}`}>
                    <CreditCard size={13} /> {college.bankDetails ? 'Edit Bank' : 'Add Bank Details'}
                  </button>
                </div>

                {college.bankDetails && (
                  <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600">
                    <span className="font-medium">{college.bankDetails.bankName}</span> · A/C: {college.bankDetails.accountNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={addModal || !!editCollege} onClose={() => { setAddModal(false); setEditCollege(null); }} title={editCollege ? 'Edit College' : 'Add College'}>
        <form onSubmit={handleSubmit(data => editCollege ? updateMutation.mutate({ id: editCollege.id, data }) : createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="label">College Name *</label>
            <input {...register('name', { required: 'Required' })} className="input" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input {...register('city')} className="input" />
            </div>
            <div>
              <label className="label">State</label>
              <input {...register('state')} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input {...register('address')} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact Email</label>
              <input {...register('contactEmail')} type="email" className="input" />
            </div>
            <div>
              <label className="label">Contact Phone</label>
              <input {...register('contactPhone')} className="input" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setAddModal(false); setEditCollege(null); }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1">
              {editCollege ? 'Update' : 'Create'} College
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!bankModal} onClose={() => setBankModal(null)} title={`Bank Details — ${bankModal?.name}`}>
        <form onSubmit={handleBank(data => bankMutation.mutate({ id: bankModal.id, data }))} className="space-y-4">
          {[
            { name: 'bankName', label: 'Bank Name' },
            { name: 'accountName', label: 'Account Holder Name' },
            { name: 'accountNumber', label: 'Account Number' },
            { name: 'ifscCode', label: 'IFSC Code' },
            { name: 'branch', label: 'Branch' },
            { name: 'upiId', label: 'UPI ID (optional)' },
          ].map(f => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input {...regBank(f.name)} className="input" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setBankModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={bankMutation.isPending} className="btn-primary flex-1">Save Details</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!qrModal} onClose={() => { setQrModal(null); setQrFile(null); }} title={`Upload QR Code — ${qrModal?.name}`} size="sm">
        <div className="space-y-4">
          {qrModal?.qrCodeUrl && (
            <div className="text-center">
              <img src={qrModal.qrCodeUrl} alt="Current QR" className="w-32 h-32 object-contain mx-auto border rounded-lg mb-2" />
              <p className="text-xs text-gray-500">Current QR Code</p>
            </div>
          )}
          <div>
            <label className="label">New QR Code Image</label>
            <input type="file" accept="image/*" onChange={e => setQrFile(e.target.files[0])} className="input" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setQrModal(null); setQrFile(null); }} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => qrFile && qrMutation.mutate({ id: qrModal.id, file: qrFile })}
              disabled={!qrFile || qrMutation.isPending}
              className="btn-primary flex-1"
            >
              Upload
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete College"
        message="Are you sure you want to delete this college? This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </Layout>
  );
}
