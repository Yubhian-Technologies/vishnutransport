import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/common/ProtectedRoute';

import StudentDashboard from './pages/student/StudentDashboard';
import ApplicationForm from './pages/student/ApplicationForm';
import ApplicationStatus from './pages/student/ApplicationStatus';
import ProfilePage from './pages/student/ProfilePage';
import BusPass from './pages/student/BusPass';
import MyAttendance from './pages/student/MyAttendance';
import AttendanceOverview from './pages/coordinator/AttendanceOverview';
import PaymentPermissions from './pages/coordinator/PaymentPermissions';
import ConcessionManagement from './pages/coordinator/ConcessionManagement';

import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import ApplicationReview from './pages/coordinator/ApplicationReview';
import CollegeManagement from './pages/coordinator/CollegeManagement';
import RouteManagement from './pages/coordinator/RouteManagement';
import CoordinatorAnalytics from './pages/coordinator/CoordinatorAnalytics';

import AccountsDashboard from './pages/accounts/AccountsDashboard';
import PaymentVerification from './pages/accounts/PaymentVerification';
import FinancialReports from './pages/accounts/FinancialReports';

import InchargeDashboard from './pages/incharge/InchargeDashboard';
import RouteStudents from './pages/incharge/RouteStudents';
import AttendanceScanner from './pages/incharge/AttendanceScanner';

import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemConfig from './pages/admin/SystemConfig';

import GuestDashboard from './pages/guest/GuestDashboard';
import GuestManagement from './pages/coordinator/GuestManagement';

const RoleRouter = () => {
  const { role } = useAuth();
  if (role === 'student') return <Navigate to="/student" replace />;
  if (role === 'faculty') return <Navigate to="/faculty" replace />;
  if (role === 'bus_coordinator') return <Navigate to="/coordinator" replace />;
  if (role === 'accounts') return <Navigate to="/accounts" replace />;
  if (role === 'bus_incharge') return <Navigate to="/incharge" replace />;
  if (role === 'super_admin') return <Navigate to="/admin" replace />;
  if (role === 'guest') return <Navigate to="/guest" replace />;
  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />

      {/* Student */}
      <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/apply" element={<ProtectedRoute roles={['student']}><ApplicationForm /></ProtectedRoute>} />
      <Route path="/student/status" element={<ProtectedRoute roles={['student']}><ApplicationStatus /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute roles={['student']}><ProfilePage /></ProtectedRoute>} />
      <Route path="/student/bus-pass" element={<ProtectedRoute roles={['student']}><BusPass /></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute roles={['student']}><MyAttendance /></ProtectedRoute>} />

      {/* Faculty — same pages as student */}
      <Route path="/faculty" element={<ProtectedRoute roles={['faculty']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/faculty/apply" element={<ProtectedRoute roles={['faculty']}><ApplicationForm /></ProtectedRoute>} />
      <Route path="/faculty/status" element={<ProtectedRoute roles={['faculty']}><ApplicationStatus /></ProtectedRoute>} />
      <Route path="/faculty/profile" element={<ProtectedRoute roles={['faculty']}><ProfilePage /></ProtectedRoute>} />
      <Route path="/faculty/bus-pass" element={<ProtectedRoute roles={['faculty']}><BusPass /></ProtectedRoute>} />
      <Route path="/faculty/attendance" element={<ProtectedRoute roles={['faculty']}><MyAttendance /></ProtectedRoute>} />

      {/* Coordinator */}
      <Route path="/coordinator" element={<ProtectedRoute roles={['bus_coordinator', 'super_admin']}><CoordinatorDashboard /></ProtectedRoute>} />
      <Route path="/coordinator/applications" element={<ProtectedRoute roles={['bus_coordinator', 'super_admin']}><ApplicationReview /></ProtectedRoute>} />
      <Route path="/coordinator/colleges" element={<ProtectedRoute roles={['bus_coordinator', 'super_admin']}><CollegeManagement /></ProtectedRoute>} />
      <Route path="/coordinator/routes" element={<ProtectedRoute roles={['bus_coordinator', 'super_admin']}><RouteManagement /></ProtectedRoute>} />
      <Route path="/coordinator/analytics" element={<ProtectedRoute roles={['bus_coordinator', 'super_admin']}><CoordinatorAnalytics /></ProtectedRoute>} />
      <Route path="/coordinator/attendance" element={<ProtectedRoute roles={['bus_coordinator', 'super_admin']}><AttendanceOverview /></ProtectedRoute>} />
      <Route path="/coordinator/payment-permissions" element={<ProtectedRoute roles={['bus_coordinator', 'super_admin']}><PaymentPermissions /></ProtectedRoute>} />
      <Route path="/coordinator/concessions" element={<ProtectedRoute roles={['bus_coordinator', 'super_admin']}><ConcessionManagement /></ProtectedRoute>} />
      <Route path="/coordinator/guests" element={<ProtectedRoute roles={['bus_coordinator', 'super_admin']}><GuestManagement /></ProtectedRoute>} />

      {/* Accounts */}
      <Route path="/accounts" element={<ProtectedRoute roles={['accounts', 'super_admin']}><AccountsDashboard /></ProtectedRoute>} />
      <Route path="/accounts/verify" element={<ProtectedRoute roles={['accounts', 'super_admin']}><PaymentVerification /></ProtectedRoute>} />
      <Route path="/accounts/reports" element={<ProtectedRoute roles={['accounts', 'super_admin']}><FinancialReports /></ProtectedRoute>} />

      {/* Bus Incharge */}
      <Route path="/incharge" element={<ProtectedRoute roles={['bus_incharge', 'super_admin']}><InchargeDashboard /></ProtectedRoute>} />
      <Route path="/incharge/students" element={<ProtectedRoute roles={['bus_incharge', 'super_admin']}><RouteStudents /></ProtectedRoute>} />
      <Route path="/incharge/attendance" element={<ProtectedRoute roles={['bus_incharge', 'super_admin']}><AttendanceScanner /></ProtectedRoute>} />

      {/* Super Admin */}
      <Route path="/admin" element={<ProtectedRoute roles={['super_admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={['super_admin']}><UserManagement /></ProtectedRoute>} />
      <Route path="/admin/config" element={<ProtectedRoute roles={['super_admin']}><SystemConfig /></ProtectedRoute>} />

      {/* Guest */}
      <Route path="/guest" element={<ProtectedRoute roles={['guest']}><GuestDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
