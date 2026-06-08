import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { profileAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { User, Phone, Briefcase, Camera, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';

export default function InchargeProfilePage() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [form, setForm] = useState({
    nameAsPerSSC: '',
    employeeId: '',
    gender: '',
    bloodGroup: '',
    branch: '',
    address: '',
    phone: '',
    studentPhone: '',
    emergencyContact: '',
  });

  useEffect(() => {
    if (userProfile) {
      setForm({
        nameAsPerSSC: userProfile.nameAsPerSSC || userProfile.name || '',
        employeeId: userProfile.employeeId || userProfile.regNo || '',
        gender: userProfile.gender || '',
        bloodGroup: userProfile.bloodGroup || '',
        branch: userProfile.branch || '',
        address: userProfile.address || '',
        phone: userProfile.phone || '',
        studentPhone: userProfile.studentPhone || '',
        emergencyContact: userProfile.emergencyContact || '',
      });
      setPhotoPreview(userProfile.photoURL || null);
    }
  }, [userProfile]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      await profileAPI.uploadPhoto(file);
      await refreshProfile();
      toast.success('Profile photo updated');
    } catch (err) {
      setPhotoPreview(userProfile?.photoURL || null);
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nameAsPerSSC.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await profileAPI.updateMe({
        name: form.nameAsPerSSC,
        nameAsPerSSC: form.nameAsPerSSC,
        employeeId: form.employeeId,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        branch: form.branch,
        address: form.address,
        phone: form.phone,
        studentPhone: form.studentPhone,
        emergencyContact: form.emergencyContact,
      });
      await refreshProfile();
      toast.success('Profile saved successfully!');
      navigate('/incharge');
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.nameAsPerSSC || userProfile?.name || 'U').charAt(0).toUpperCase();

  return (
    <Layout title="My Profile">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Avatar card */}
          <div className="card flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 group"
                title="Change profile photo"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  {photoUploading
                    ? <Loader2 size={18} className="text-white animate-spin" />
                    : <><Camera size={18} className="text-white" /><span className="text-white text-xs">Change</span></>
                  }
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{form.nameAsPerSSC || '—'}</p>
              <p className="text-sm text-gray-500 truncate">{userProfile?.email}</p>
              <p className="text-xs text-purple-600 font-medium mt-0.5">Bus Incharge</p>
              {userProfile?.collegeName && (
                <p className="text-xs text-gray-400 mt-0.5">{userProfile.collegeName}</p>
              )}
            </div>

            <div className="ml-auto flex-shrink-0">
              {userProfile?.profileCompleted && (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle2 size={12} /> Complete
                </span>
              )}
            </div>
          </div>

          {/* Personal Details */}
          <div className="card space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">
              <User size={15} /> Personal Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Full Name *</label>
                <input
                  value={form.nameAsPerSSC}
                  onChange={set('nameAsPerSSC')}
                  placeholder="As per official records"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Employee ID</label>
                <input
                  value={form.employeeId}
                  onChange={set('employeeId')}
                  placeholder="e.g. EMP001"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Gender</label>
                <div className="select-wrapper">
                  <select value={form.gender} onChange={set('gender')} className="select">
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown size={15} className="select-chevron" />
                </div>
              </div>
              <div>
                <label className="label">Blood Group</label>
                <div className="select-wrapper">
                  <select value={form.bloodGroup} onChange={set('bloodGroup')} className="select">
                    <option value="">Select Blood Group</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="select-chevron" />
                </div>
              </div>
              <div>
                <label className="label">Email Address</label>
                <input
                  value={userProfile?.email || ''}
                  disabled
                  className="input bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Residential Address</label>
                <textarea
                  value={form.address}
                  onChange={set('address')}
                  rows={2}
                  placeholder="Full residential address"
                  className="input resize-none"
                />
              </div>
            </div>
          </div>

          {/* Work Details */}
          <div className="card space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">
              <Briefcase size={15} /> Work Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Department / Branch</label>
                <input
                  value={form.branch}
                  onChange={set('branch')}
                  placeholder="e.g. CSE, Administration"
                  className="input"
                />
              </div>
              <div>
                <label className="label">College</label>
                <input
                  value={userProfile?.collegeName || '—'}
                  disabled
                  className="input bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Set during registration</p>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="card space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">
              <Phone size={15} /> Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Primary Phone</label>
                <input
                  value={form.phone}
                  onChange={set('phone')}
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Alternate Phone</label>
                <input
                  value={form.studentPhone}
                  onChange={set('studentPhone')}
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Emergency Contact</label>
                <input
                  value={form.emergencyContact}
                  onChange={set('emergencyContact')}
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="input"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/incharge')} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving || photoUploading} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
