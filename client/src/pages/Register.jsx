import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { collegesAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Bus, Eye, EyeOff, GraduationCap, BookOpen, CheckCircle2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Enter a valid phone number').optional().or(z.literal('')),
  collegeId: z.string().min(1, 'Please select your college'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const PERKS = [
  'Clean and well-maintained buses',
  'Experienced and trained drivers',
  'On-board security for safe travel',
  'GPS-tracked routes for peace of mind',
];

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('student');

  const { data: colleges = [] } = useQuery({ queryKey: ['colleges'], queryFn: collegesAPI.getAll });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const college = colleges.find(c => c.id === data.collegeId);
      await registerUser(data.email, data.password, data.name, role, data.phone, data.collegeId, college?.name || '');
      toast.success('Account created! Please complete your profile.');
      navigate(role === 'faculty' ? '/faculty/profile' : '/student/profile');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-[45%] relative overflow-hidden flex-col items-center justify-center p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #0c1f6e 0%, #1a3a9f 45%, #2563eb 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute -top-28 -left-28 w-[420px] h-[420px] rounded-full bg-white/5" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 left-10 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-20 right-1/3 w-16 h-16 rounded-full bg-white/10" />
        <div className="absolute bottom-1/3 left-8 w-10 h-10 rounded-full bg-white/10" />

        {/* Main content */}
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-12">
            <img
              src="https://res.cloudinary.com/dljzfysft/image/upload/v1777358383/download_u6eeyl.jpg"
              alt="Vishnu Logo"
              className="w-14 h-14 object-contain rounded-xl bg-white/10 p-1 shadow-lg"
            />
            <div>
              <p className="font-bold text-lg leading-tight">Vishnu Transportation</p>
              <p className="text-blue-300 text-xs tracking-wide">College Bus Management</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Join the<br />Vishnu Bus<br />
            <span className="text-blue-300">Community.</span>
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed mb-10">
            Create your account and get started with your college bus transport in just a few steps.
          </p>

          <div className="space-y-4">
            {PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-blue-300 flex-shrink-0" />
                <p className="text-sm text-blue-100">{perk}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bus watermark */}
        <div className="absolute bottom-8 right-6 opacity-[0.07] pointer-events-none">
          <Bus size={200} />
        </div>

        {/* Route stop decoration */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-25 w-48">
          {[0,1,2,3,4,5,6].map((i) => (
            <React.Fragment key={i}>
              <div className={`rounded-full bg-white flex-shrink-0 ${i === 0 || i === 6 ? 'w-3 h-3' : 'w-1.5 h-1.5'}`} />
              {i < 6 && <div className="flex-1 h-px bg-white/60" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-xl shadow-md mb-3">
            <Bus size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Vishnu Transportation</h1>
        </div>

        <div className="w-full max-w-sm py-8">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-500 text-sm mt-1">Register to apply for the college bus</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7">
            {/* Role toggle */}
            <div className="flex rounded-lg border border-gray-200 p-1 mb-5 bg-gray-50">
              {[
                { value: 'student', label: 'Student', Icon: GraduationCap },
                { value: 'faculty', label: 'Faculty', Icon: BookOpen },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                    role === value
                      ? 'bg-white text-primary-700 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  {...register('name')}
                  placeholder="John Doe"
                  className={`input ${errors.name ? 'input-error' : ''}`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@college.edu"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="label">
                  Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="+91 98765 43210"
                  className={`input ${errors.phone ? 'input-error' : ''}`}
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="label">College</label>
                <select
                  {...register('collegeId')}
                  className={`input ${errors.collegeId ? 'input-error' : ''}`}
                >
                  <option value="">-- Select your college --</option>
                  {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.collegeId && <p className="text-red-500 text-xs mt-1">{errors.collegeId.message}</p>}
                {colleges.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No colleges configured yet. Contact admin.</p>
                )}
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="Re-enter password"
                  className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
                {loading ? 'Creating Account...' : `Create ${role === 'faculty' ? 'Faculty' : 'Student'} Account`}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-gray-400 select-none mt-6">
            Developed by Yubhian Technologies LLP
          </p>
        </div>
      </div>
    </div>
  );
}