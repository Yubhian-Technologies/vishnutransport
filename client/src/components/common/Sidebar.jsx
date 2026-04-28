import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';
import {
  Bus, LayoutDashboard, FileText, Building2, Route,
  BarChart3, CreditCard, Users, Settings, LogOut, UserCheck,
  BookOpen, ShieldCheck, UserCircle, ScanLine, CalendarDays, Percent,
} from 'lucide-react';
import toast from 'react-hot-toast';

const NAV_CONFIG = {
  student: [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/student/apply', icon: FileText, label: 'Apply for Bus' },
    { to: '/student/status', icon: BookOpen, label: 'Application Status' },
    { to: '/student/bus-pass', icon: Bus, label: 'Bus Pass' },
    { to: '/student/attendance', icon: CalendarDays, label: 'My Attendance' },
    { to: '/student/profile', icon: UserCircle, label: 'My Profile' },
  ],
  faculty: [
    { to: '/faculty', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/faculty/apply', icon: FileText, label: 'Apply for Bus' },
    { to: '/faculty/status', icon: BookOpen, label: 'Application Status' },
    { to: '/faculty/bus-pass', icon: Bus, label: 'Bus Pass' },
    { to: '/faculty/attendance', icon: CalendarDays, label: 'My Attendance' },
    { to: '/faculty/profile', icon: UserCircle, label: 'My Profile' },
  ],
  bus_coordinator: [
    { to: '/coordinator', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/coordinator/applications', icon: FileText, label: 'Applications' },
    { to: '/coordinator/colleges', icon: Building2, label: 'Colleges' },
    { to: '/coordinator/routes', icon: Route, label: 'Routes & Buses' },
    { to: '/coordinator/attendance', icon: CalendarDays, label: 'Attendance' },
    { to: '/coordinator/payment-permissions', icon: Percent, label: 'Payment Permissions' },
    { to: '/coordinator/analytics', icon: BarChart3, label: 'Analytics' },
  ],
  accounts: [
    { to: '/accounts', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/accounts/verify', icon: ShieldCheck, label: 'Payment Verification' },
    { to: '/accounts/reports', icon: BarChart3, label: 'Financial Reports' },
  ],
  bus_incharge: [
    { to: '/incharge', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/incharge/students', icon: Users, label: 'Route Students' },
    { to: '/incharge/attendance', icon: ScanLine, label: 'Scan Attendance' },
  ],
  super_admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/coordinator', icon: Bus, label: 'Coordinator Panel' },
    { to: '/accounts', icon: CreditCard, label: 'Accounts Panel' },
    { to: '/admin/config', icon: Settings, label: 'System Config' },
  ],
};

const ROLE_LABELS = {
  student: 'Student',
  faculty: 'Faculty',
  bus_coordinator: 'Bus Coordinator',
  accounts: 'Accounts',
  bus_incharge: 'Bus Incharge',
  super_admin: 'Super Admin',
};

export default function Sidebar({ isOpen, onClose }) {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const role = userProfile?.role;
  const navItems = NAV_CONFIG[role] || [];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      toast.error('Failed to logout');
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30 flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
          <img src="https://res.cloudinary.com/dljzfysft/image/upload/v1777358383/download_u6eeyl.jpg" alt="Vishnu Logo" className="w-10 h-10 object-contain flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">Vishnu Transportation</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[role] || 'Portal'}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx('sidebar-link', isActive ? 'sidebar-link-active' : 'sidebar-link-inactive')
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-gray-900 truncate">{userProfile?.name}</p>
            <p className="text-xs text-gray-500 truncate">{userProfile?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link sidebar-link-inactive w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
