import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, X, CheckCheck, Clock, Info } from 'lucide-react';

export default function NotificationsModal() {
  const { notifications, unreadCount, isOpen, closeModal, markAsRead, markAllAsRead } = useNotifications();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center sm:justify-end sm:pr-8 pt-16 bg-slate-900/30 backdrop-blur-xs p-4"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-sm bg-white rounded-xl p-4 shadow-xl border border-slate-200 space-y-3 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={closeModal}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar pr-1">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">No notifications right now</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  n.read
                    ? 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                    : 'bg-indigo-50/50 border-indigo-100 text-slate-900 hover:border-indigo-200 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-xs font-semibold ${n.read ? 'text-slate-700' : 'text-indigo-900'}`}>
                    {n.title}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {n.created_at || 'Just now'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{n.message}</p>
              </div>
            ))
          )}
        </div>

        {unreadCount > 0 && (
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={markAllAsRead}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
