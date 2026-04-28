import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, UserCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar({ onMenuClick, title }) {
  const { userProfile, role } = useAuth();
  const navigate = useNavigate();

  const profilePath = role === 'faculty' ? '/faculty/profile'
    : role === 'student' ? '/student/profile'
    : null;

  const initials = userProfile?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative" aria-label="Notifications">
          <Bell size={18} className="text-gray-600" />
        </button>

        {profilePath ? (
          <button
            onClick={() => navigate(profilePath)}
            title="Edit profile"
            className="relative group w-8 h-8 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1"
          >
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <UserCircle size={14} className="text-white" />
            </div>
          </button>
        ) : (
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {initials}
          </div>
        )}
      </div>
    </header>
  );
}
