import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  CheckSquare,
  Sparkles,
  Users,
  GraduationCap,
  ShieldCheck,
  X,
  LogOut,
} from 'lucide-react';

export default function NavigationDrawer({ isOpen, onClose }) {
  const { user, role, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleRoleChange = async (targetRole) => {
    await switchDemoRole(targetRole);
    onClose();
    if (targetRole === 'Student') navigate('/student');
    else if (targetRole === 'Company') navigate('/company');
    else if (targetRole === 'Mentor') navigate('/mentor');
    else if (targetRole === 'Admin') navigate('/admin');
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  const getInitials = () => {
    if (user?.full_name) {
      const parts = user.full_name.split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : user.full_name.slice(0, 2).toUpperCase();
    }
    return 'IC';
  };

  return (
    <div
      id="drawerOverlay"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-72 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col justify-between p-5 border-r border-slate-200 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Header profile info */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-indigo-100 bg-indigo-50 flex items-center justify-center font-bold text-indigo-700 text-sm">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitials()}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-slate-900 text-sm truncate">
                  {user?.full_name || user?.email || 'Candidate'}
                </h3>
                <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold uppercase">
                  {role} Workspace
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {role === 'student' && (
              <>
                <NavLink
                  to="/student"
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                  <span>Dashboard Overview</span>
                </NavLink>

                <NavLink
                  to="/student/explore"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Explore Internships</span>
                </NavLink>

                <NavLink
                  to="/student/applications"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>My Applications</span>
                </NavLink>

                <NavLink
                  to="/student/tasks"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>Mentorship & Tasks</span>
                </NavLink>

                <NavLink
                  to="/student/ai-coach"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>AI Career Assistant</span>
                </NavLink>
              </>
            )}

            {role === 'company' && (
              <>
                <NavLink
                  to="/company"
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                  <span>CRM Pipeline Kanban</span>
                </NavLink>
                <NavLink
                  to="/company?view=candidates"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Candidate Directory</span>
                </NavLink>
                <NavLink
                  to="/company?view=postings"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Role Postings</span>
                </NavLink>
                <NavLink
                  to="/student/explore"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Explore Market</span>
                </NavLink>
                <NavLink
                  to="/student/ai-coach"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>AI Career Assistant</span>
                </NavLink>
              </>
            )}

            {role === 'mentor' && (
              <>
                <NavLink
                  to="/mentor"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Mentor Hub</span>
                </NavLink>
                <NavLink
                  to="/student/tasks"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>Deliverables Review</span>
                </NavLink>
              </>
            )}

            {role === 'admin' && (
              <>
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Admin Console</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Footer with Role Switch & Logout */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-1 text-xs">
            <button
              onClick={() => handleRoleChange('Student')}
              className={`p-1.5 rounded-md border text-center font-medium ${
                role === 'student' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => handleRoleChange('Company')}
              className={`p-1.5 rounded-md border text-center font-medium ${
                role === 'company' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200'
              }`}
            >
              Recruiter
            </button>
            <button
              onClick={() => handleRoleChange('Mentor')}
              className={`p-1.5 rounded-md border text-center font-medium ${
                role === 'mentor' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200'
              }`}
            >
              Mentor
            </button>
            <button
              onClick={() => handleRoleChange('Admin')}
              className={`p-1.5 rounded-md border text-center font-medium ${
                role === 'admin' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200'
              }`}
            >
              Admin
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
