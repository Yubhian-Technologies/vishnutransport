import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Bus, Eye, EyeOff, Shield, UserCheck, Sparkles } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const FEATURES = [
  { icon: Sparkles, title: 'Clean & Neat Buses', desc: 'Travel in well-maintained, spotlessly clean buses every day' },
  { icon: UserCheck, title: 'Experienced Drivers', desc: 'Skilled and trained drivers ensuring a safe, smooth journey' },
  { icon: Shield, title: 'Your Safety, Our Priority', desc: 'GPS-tracked rides with on-board security for your peace of mind' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : err.message || 'Login failed';
      toast.error(msg);
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
            Your Campus<br />Commute,<br />
            <span className="text-blue-300">Simplified.</span>
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed mb-12">
            Apply for your bus pass, track your application status, and access your digital pass — all in one place.
          </p>

          <div className="space-y-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-blue-200" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-blue-300 text-xs mt-0.5">{desc}</p>
                </div>
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
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
        {/* Mobile header */}
        <div className="lg:hidden text-center mb-8">
          <img
            src="https://res.cloudinary.com/dljzfysft/image/upload/v1777358383/download_u6eeyl.jpg"
            alt="Vishnu Logo"
            className="w-16 h-16 object-contain mx-auto mb-3"
          />
          <h1 className="text-xl font-bold text-gray-900">Vishnu Transportation</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  autoComplete="email"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                    autoComplete="current-password"
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

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:underline">
                Register here
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