import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { routesAPI, boardingPointsAPI, collegesAPI, usersAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, MapPin, UserCheck, Bus, ChevronDown, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';

const EMPTY_BP = () => ({ name: '', timings: '', location: '', fare: '', partialFare: '', order: '' });

export default function RouteManagement() {
  const queryClient = useQueryClient();
  const [routeModal, setRouteModal] = useState(false);
  const [editRoute, setEditRoute] = useState(null);
  const [bpModal, setBpModal] = useState(null);
  const [inchargeModal, setInchargeModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [bpRows, setBpRows] = useState([EMPTY_BP()]);
  const [saving, setSaving] = useState(false);

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: () => routesAPI.getAll({ includeOccupancy: 'true' }),
  });
  const { data: colleges = [] } = useQuery({ queryKey: ['colleges'], queryFn: collegesAPI.getAll });
  const { data: incharges = [] } = useQuery({ queryKey: ['incharges'], queryFn: usersAPI.getIncharges });

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: { collegeIds: [] },
  });
  const { register: regBP, handleSubmit: handleBP, reset: resetBP } = useForm();

  const updateRoute = useMutation({
    mutationFn: ({ id, data }) => routesAPI.update(id, data),
    onSuccess: () => { toast.success('Route updated'); setEditRoute(null); queryClient.invalidateQueries({ queryKey: ['routes'] }); },
    onError: e => toast.error(e.message),
  });

  const deleteRoute = useMutation({
    mutationFn: routesAPI.delete,
    onSuccess: () => { toast.success('Route deleted'); queryClient.invalidateQueries({ queryKey: ['routes'] }); },
    onError: e => toast.error(e.message),
  });

  const createBP = useMutation({
    mutationFn: boardingPointsAPI.create,
    onSuccess: () => {
      toast.success('Boarding point added');
      setBpModal(null);
      resetBP();
      queryClient.invalidateQueries({ queryKey: ['boarding-points'] });
    },
    onError: e => toast.error(e.message),
  });

  const deleteBP = useMutation({
    mutationFn: boardingPointsAPI.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boarding-points'] }),
  });

  const assignIncharge = useMutation({
    mutationFn: ({ routeId, inchargeId }) => routesAPI.assignIncharge(routeId, inchargeId),
    onSuccess: () => { toast.success('Incharge assigned'); setInchargeModal(null); queryClient.invalidateQueries({ queryKey: ['routes'] }); },
    onError: e => toast.error(e.message),
  });

  const openEdit = (route) => {
    setEditRoute(route);
    Object.entries(route).forEach(([k, v]) => setValue(k, v));
  };

  const closeRouteModal = () => {
    setRouteModal(false);
    setEditRoute(null);
    setBpRows([EMPTY_BP()]);
    reset();
  };

  const updateBpRow = (index, field, value) => {
    setBpRows(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const removeBpRow = (index) => {
    setBpRows(rows => rows.length === 1 ? [EMPTY_BP()] : rows.filter((_, i) => i !== index));
  };

  const handleCreateRoute = async (formData) => {
    const validBps = bpRows.filter(bp => bp.name.trim());
    if (validBps.length === 0) {
      toast.error('Add at least one boarding point');
      return;
    }
    setSaving(true);
    try {
      const routeRes = await routesAPI.create(formData);
      const routeId = routeRes.id;
      await Promise.all(
        validBps.map((bp, i) =>
          boardingPointsAPI.create({
            routeId,
            name: bp.name.trim(),
            timings: bp.timings || '',
            location: bp.location || '',
            order: bp.order !== '' ? Number(bp.order) : i,
            fare: bp.fare !== '' ? Number(bp.fare) : undefined,
            partialFare: bp.partialFare !== '' ? Number(bp.partialFare) : undefined,
          })
        )
      );
      toast.success(`Route created with ${validBps.length} boarding point${validBps.length > 1 ? 's' : ''}`);
      closeRouteModal();
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['boarding-points'] });
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to create route');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Routes & Bus Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{routes.length} route{routes.length !== 1 ? 's' : ''} configured</p>
          <button onClick={() => { reset(); setBpRows([EMPTY_BP()]); setRouteModal(true); }} className="btn-primary">
            <Plus size={16} /> Add Route
          </button>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <div className="space-y-3">
            {routes.map(route => (
              <div key={route.id} className="card">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bus size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{route.routeName}</h3>
                      {route.routeNumber && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{route.routeNumber}</span>}
                      {route.busNumber && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">Bus: {route.busNumber}</span>}
                    </div>
                    <p className="text-xs text-gray-500">{route.startPoint} → {route.endPoint}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-primary-700">{formatCurrency(route.fare)}</p>
                      <p className="text-xs text-gray-400">Base Fare</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{route.availableSeats ?? '—'}</p>
                      <p className="text-xs text-gray-400">Available</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{route.seatCapacity}</p>
                      <p className="text-xs text-gray-400">Capacity</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(route)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600"><Edit size={14} /></button>
                    <button onClick={() => setDeleteTarget(route.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                    <button onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
                      {expandedRoute === route.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>

                {expandedRoute === route.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { setBpModal(route.id); resetBP(); }} className="btn-outline text-xs py-1">
                        <MapPin size={13} /> Manage Boarding Points
                      </button>
                      <button onClick={() => setInchargeModal(route)} className="btn-outline text-xs py-1">
                        <UserCheck size={13} /> Assign Incharge
                      </button>
                    </div>
                    <BoardingPointsList routeId={route.id} onDelete={id => deleteBP.mutate(id)} />
                    {route.inchargeId && (
                      <p className="text-xs text-gray-500">
                        Incharge: {incharges.find(i => i.id === route.inchargeId)?.name || route.inchargeId}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Route Modal */}
      <Modal isOpen={routeModal || !!editRoute} onClose={closeRouteModal} title={editRoute ? 'Edit Route' : 'Add Route'} size="lg">
        <form
          onSubmit={handleSubmit(editRoute
            ? (data) => updateRoute.mutate({ id: editRoute.id, data })
            : handleCreateRoute
          )}
          className="space-y-5"
        >
          {/* Route details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Route Name *</label>
              <input {...register('routeName', { required: true })} placeholder="e.g. City Center Route" className="input" />
            </div>
            <div>
              <label className="label">Route Number</label>
              <input {...register('routeNumber')} placeholder="e.g. R-01" className="input" />
            </div>
            <div>
              <label className="label">Start Point</label>
              <input {...register('startPoint')} placeholder="From" className="input" />
            </div>
            <div>
              <label className="label">End Point</label>
              <input {...register('endPoint')} placeholder="To" className="input" />
            </div>
            <div>
              <label className="label">Seat Capacity *</label>
              <input {...register('seatCapacity', { required: true })} type="number" min={1} className="input" />
            </div>
            <div>
              <label className="label">Base Fare (₹) *</label>
              <input {...register('fare', { required: true })} type="number" min={0} className="input" />
            </div>
            <div>
              <label className="label">Bus Number</label>
              <input {...register('busNumber')} className="input" />
            </div>
            <div>
              <label className="label">Driver Name</label>
              <input {...register('driverName')} className="input" />
            </div>
            <div>
              <label className="label">Driver Phone</label>
              <input {...register('driverPhone')} className="input" />
            </div>
          </div>

          {/* College assignment */}
          <div>
            <label className="label">Assign to Colleges</label>
            <div className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
              {colleges.length === 0 ? (
                <p className="text-xs text-gray-400">No colleges added yet</p>
              ) : colleges.map(c => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input type="checkbox" value={c.id} {...register('collegeIds')} className="rounded text-primary-600" />
                  <span className="text-sm">{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Bus Incharge assignment */}
          <div>
            <label className="label">Assign Bus Incharge</label>
            <select {...register('inchargeId')} className="input">
              <option value="">-- Select Incharge --</option>
              {incharges.map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.email})</option>
              ))}
            </select>
            {incharges.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No bus incharge users found. Create one from Admin → User Management.</p>
            )}
          </div>

          {/* Inline boarding points — only for create */}
          {!editRoute && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Boarding Points *</label>
                <button
                  type="button"
                  onClick={() => setBpRows(r => [...r, EMPTY_BP()])}
                  className="btn-outline text-xs py-1"
                >
                  <Plus size={13} /> Add Stop
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {bpRows.map((bp, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Stop {i + 1}</span>
                      <button type="button" onClick={() => removeBpRow(i)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <input
                          value={bp.name}
                          onChange={e => updateBpRow(i, 'name', e.target.value)}
                          placeholder="Stop name *"
                          className="input text-sm"
                        />
                      </div>
                      <input
                        value={bp.timings}
                        onChange={e => updateBpRow(i, 'timings', e.target.value)}
                        placeholder="Pickup time (e.g. 7:30 AM)"
                        className="input text-sm"
                      />
                      <input
                        value={bp.location}
                        onChange={e => updateBpRow(i, 'location', e.target.value)}
                        placeholder="Landmark (optional)"
                        className="input text-sm"
                      />
                      <input
                        value={bp.fare}
                        onChange={e => updateBpRow(i, 'fare', e.target.value)}
                        placeholder="Fare ₹ *"
                        type="number"
                        min={0}
                        className="input text-sm"
                      />
                      <input
                        value={bp.partialFare}
                        onChange={e => updateBpRow(i, 'partialFare', e.target.value)}
                        placeholder="Partial fare ₹ (optional)"
                        type="number"
                        min={0}
                        className="input text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeRouteModal} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving || updateRoute.isPending} className="btn-primary flex-1">
              {saving ? 'Saving…' : editRoute ? 'Update Route' : 'Create Route'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manage boarding points for existing routes */}
      <Modal isOpen={!!bpModal} onClose={() => setBpModal(null)} title="Manage Boarding Points">
        <form onSubmit={handleBP(data => createBP.mutate({ ...data, routeId: bpModal }))} className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Stop Name *</label>
              <input {...regBP('name', { required: true })} className="input" />
            </div>
            <div>
              <label className="label">Pickup Time</label>
              <input {...regBP('timings')} placeholder="e.g. 7:30 AM" className="input" />
            </div>
            <div>
              <label className="label">Location</label>
              <input {...regBP('location')} placeholder="Landmark" className="input" />
            </div>
            <div>
              <label className="label">Order</label>
              <input {...regBP('order')} type="number" min={0} className="input" />
            </div>
            <div>
              <label className="label">Fare (₹) *</label>
              <input {...regBP('fare', { required: true })} type="number" min={0} className="input" />
            </div>
            <div>
              <label className="label">Partial Fare (₹)</label>
              <input {...regBP('partialFare')} type="number" min={0} className="input" />
            </div>
          </div>
          <button type="submit" disabled={createBP.isPending} className="btn-primary">
            <Plus size={14} /> Add Stop
          </button>
        </form>
        <BoardingPointsList routeId={bpModal} onDelete={id => deleteBP.mutate(id)} />
      </Modal>

      <Modal isOpen={!!inchargeModal} onClose={() => setInchargeModal(null)} title={`Assign Incharge — ${inchargeModal?.routeName}`} size="sm">
        <div className="space-y-3">
          {incharges.length === 0 ? (
            <p className="text-sm text-gray-500">No bus incharge users found. Create one from Admin → User Management.</p>
          ) : incharges.map(i => (
            <button key={i.id} onClick={() => assignIncharge.mutate({ routeId: inchargeModal?.id, inchargeId: i.id })} className="w-full text-left flex items-center justify-between p-3 border rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors">
              <div>
                <p className="font-medium text-sm">{i.name}</p>
                <p className="text-xs text-gray-500">{i.email}</p>
              </div>
              {inchargeModal?.inchargeId === i.id && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Current</span>}
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteRoute.mutate(deleteTarget)}
        title="Delete Route"
        message="Are you sure? Routes with existing applications cannot be deleted."
        confirmLabel="Delete"
        danger
      />
    </Layout>
  );
}

function BoardingPointsList({ routeId, onDelete }) {
  const { data: points = [] } = useQuery({
    queryKey: ['boarding-points', routeId],
    queryFn: () => boardingPointsAPI.getByRoute(routeId),
    enabled: !!routeId,
  });

  if (!points.length) return <p className="text-xs text-gray-400 py-2">No boarding points yet.</p>;

  return (
    <div className="space-y-1.5">
      {points.map((bp, i) => (
        <div key={bp.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
            <div className="min-w-0">
              <span className="text-sm font-medium">{bp.name}</span>
              {bp.timings && <span className="text-xs text-gray-400 ml-2">{bp.timings}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {bp.fare != null && <span className="text-xs font-semibold text-primary-700">₹{bp.fare}</span>}
            <button onClick={() => onDelete(bp.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
