import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { useAttendanceNotification } from '../../hooks/useAttendanceNotification';

export default function Layout({ children, title = 'Dashboard' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, role } = useAuth();
  useAttendanceNotification(currentUser, role);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Navbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 page-enter">
            {children}
          </div>
          <div className="px-4 lg:px-6 pb-3">
            <p className="text-[11px] text-gray-400 select-none">Developed by Yubhian Technologies LLP</p>
          </div>
        </main>
      </div>
    </div>
  );
}
