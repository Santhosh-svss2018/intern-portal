import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500 font-medium">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = (role || user.role || 'student').toLowerCase();

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
    if (!normalizedAllowed.includes(normalizedRole)) {
      if (normalizedRole === 'student') return <Navigate to="/student" replace />;
      if (normalizedRole === 'company') return <Navigate to="/company" replace />;
      if (normalizedRole === 'mentor') return <Navigate to="/mentor" replace />;
      if (normalizedRole === 'admin') return <Navigate to="/admin" replace />;
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
