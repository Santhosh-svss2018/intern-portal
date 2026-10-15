import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NavigationDrawer from './NavigationDrawer';
import NotificationsModal from './NotificationsModal';
import { Menu, Bell, Sparkles } from 'lucide-react';

export default function TopAppBar({ title = "InternConnect AI", subtitle }) {
  const { user, role } = useAuth();
  const { unreadCount, toggleModal } = useNotifications();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getInitials = () => {
    if (user?.role === 'company') return 'TC';
    if (user?.role === 'admin') return 'AD';
    if (user?.role === 'mentor') return 'EV';
    if (user?.full_name) {
      const parts = user.full_name.split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : user.full_name.slice(0, 2).toUpperCase();
    }
    return 'AM';
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 transition-all">
        <div className="flex justify-between items-center w-full px-4 py-3 max-w-7xl mx-auto">
          {/* Menu button & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              type="button"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {title}
              </span>
              {role === 'admin' ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide">Ops Live</span>
                </div>
              ) : (
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Enterprise
                </span>
              )}
            </div>
          </div>

          {/* Actions & Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleModal}
              aria-label="Notifications"
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              type="button"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
              )}
            </button>

            <div
              onClick={() => setIsDrawerOpen(true)}
              className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-slate-200 shrink-0 bg-indigo-100 text-indigo-700 flex items-center justify-center cursor-pointer text-xs font-bold hover:ring-2 hover:ring-indigo-600 transition-all"
              title="Open profile menu"
            >
              {user?.avatar_url ? (
                <img className="w-full h-full object-cover" src={user.avatar_url} alt={user?.full_name || "Profile"} />
              ) : (
                <span>{getInitials()}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Slide-out navigation drawer & notifications modal */}
      <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <NotificationsModal />
    </>
  );
}
