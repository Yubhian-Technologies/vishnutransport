import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;

  const roleRedirects = {
    student: '/student',
    bus_coordinator: '/coordinator',
    accounts: '/accounts',
    bus_incharge: '/incharge',
    super_admin: '/admin',
  };

  const path = roleRedirects[role];
  if (path) return <Navigate to={path} replace />;

  return <Navigate to="/login" replace />;
}
