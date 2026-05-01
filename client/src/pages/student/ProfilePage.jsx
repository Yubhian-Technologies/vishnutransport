import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { profileAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { User, Phone, Users, CheckCircle2, Camera, Loader2, Lock } from 'lucide-react';

export default function ProfilePage() {
  const { userProfile, role, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const base = role === 'faculty' ? '/faculty' : '/student';
  const fileInputRef = useRef(null);

  const EDIT_LIMIT = 2;
  const editCount = userProfile?.profileEditCount || 0;
  const isLocked = role === 'student' && editCount >= EDIT_LIMIT;
  const editsLeft = role === 'student' ? Math.max(0, EDIT_LIMIT - editCount) : null;

  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [form, setForm] = useState({
    name: '', nameAsPerSSC: '', gender: '', bloodGroup: '',
    academicYear: '', dateOfJoining: '', address: '', regNo: '', studentPhone: '', emergencyContact: '',
    parentName: '', parentPhone: '', phone: '',
  });

  useEffect(() => {
    if (userProfile) {
      setForm({
        name: userProfile.name || '',
        nameAsPerSSC: userProfile.nameAsPerSSC || '',
        gender: userProfile.gender || '',
        bloodGroup: userProfile.bloodGroup || '',
        academicYear: userProfile.academicYear || '',
        dateOfJoining: userProfile.dateOfJoining || '',
        address: userProfile.address || '',
        regNo: userProfile.regNo || '',
        studentPhone: userProfile.studentPhone || '',
        emergencyContact: userProfile.emergencyContact || '',
        parentName: userProfile.parentName || '',
        parentPhone: userProfile.parentPhone || '',
        phone: userProfile.phone || '',
      });
      setPhotoPreview(userProfile.photoURL || null);
    }
  }, [userProfile]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPhotoPreview(localPreview);
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
    if (!form.nameAsPerSSC.trim()) { toast.error('Name as per SSC is required'); return; }
    setSaving(true);
    try {
      await updateProfile({ ...form, name: form.nameAsPerSSC });
      toast.success('Profile saved successfully!');
      navigate(base);
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = form.nameAsPerSSC?.charAt(0)?.toUpperCase() || 'U';

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
                  <div className="w-full h-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold">
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
              {userProfile?.college && (
                <p className="text-xs text-gray-400 mt-0.5">{userProfile.college}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Click photo to change</p>
            </div>

            <div className="ml-auto flex flex-col items-end gap-1 flex-shrink-0">
              {userProfile?.profileCompleted && (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle2 size={12} /> Complete
                </span>
              )}
              {role === 'student' && (
                isLocked ? (
                  <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    <Lock size={12} /> Profile locked
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">{editsLeft} edit{editsLeft !== 1 ? 's' : ''} remaining</span>
                )
              )}
            </div>
          </div>

          {/* Lock banner */}
          {isLocked && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <Lock size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Profile Locked</p>
                <p className="text-xs text-red-600 mt-0.5">You have used all {EDIT_LIMIT} allowed edits. Contact the bus coordinator if you need to make changes.</p>
              </div>
            </div>
          )}

          {/* Personal Details */}
          <div className="card space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">
              <User size={15} /> Personal Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name as per SSC *</label>
                <input value={form.nameAsPerSSC} onChange={set('nameAsPerSSC')} placeholder="As printed on SSC certificate" disabled={isLocked} className={`input ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} required />
              </div>
              <div>
                <label className="label">Gender</label>
                <select value={form.gender} onChange={set('gender')} disabled={isLocked} className={`input ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}>
                  <option value="">-- Select Gender --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Blood Group</label>
                <select value={form.bloodGroup} onChange={set('bloodGroup')} disabled={isLocked} className={`input ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}>
                  <option value="">-- Select Blood Group --</option>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              {role === 'faculty' ? (
                <div>
                  <label className="label">Date of Joining</label>
                  <input type="date" value={form.dateOfJoining} onChange={set('dateOfJoining')} className="input" />
                </div>
              ) : (
                <div>
                  <label className="label">Academic Year</label>
                  <select value={form.academicYear} onChange={set('academicYear')} disabled={isLocked} className={`input ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}>
                    <option value="">-- Select Year --</option>
                    {['1', '2', '3', '4', '5'].map(y => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>
              )}
              {role === 'student' && (
                <div>
                  <label className="label">Registration Number</label>
                  <input value={form.regNo} onChange={set('regNo')} placeholder="e.g. 22A91A0501" disabled={isLocked} className={`input ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} />
                </div>
              )}
              <div>
                <label className="label">Email Address</label>
                <input value={userProfile?.email || ''} disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
            </div>
            <div>
              <label className="label">Residential Address</label>
              <textarea value={form.address} onChange={set('address')} rows={2} placeholder="Full residential address" disabled={isLocked} className={`input resize-none ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} />
            </div>
          </div>

          {/* Contact Details */}
          <div className="card space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">
              <Phone size={15} /> Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Student Phone</label>
                <input value={form.studentPhone} onChange={set('studentPhone')} type="tel" placeholder="+91 98765 43210" disabled={isLocked} className={`input ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} />
              </div>
              <div>
                <label className="label">Emergency Contact</label>
                <input value={form.emergencyContact} onChange={set('emergencyContact')} type="tel" placeholder="+91 98765 43210" disabled={isLocked} className={`input ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} />
              </div>
            </div>
          </div>

          {/* Parent / Guardian */}
          <div className="card space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">
              <Users size={15} /> Parent / Guardian Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Parent / Guardian Name</label>
                <input value={form.parentName} onChange={set('parentName')} placeholder="Father / Mother / Guardian" disabled={isLocked} className={`input ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} />
              </div>
              <div>
                <label className="label">Parent / Guardian Phone</label>
                <input value={form.parentPhone} onChange={set('parentPhone')} type="tel" placeholder="+91 98765 43210" disabled={isLocked} className={`input ${isLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(base)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving || photoUploading || isLocked} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : isLocked ? 'Profile Locked' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
