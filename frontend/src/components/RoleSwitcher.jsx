import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Building2, UserCheck, ShieldCheck } from 'lucide-react';

export default function RoleSwitcher({ currentView }) {
  const { role, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = async (roleName, path) => {
    await switchDemoRole(roleName);
    navigate(path);
  };

  const activeRole = currentView || role;

  const roles = [
    { name: 'Student', path: '/student', key: 'student', label: 'Student Hub', icon: GraduationCap },
    { name: 'Company', path: '/company', key: 'company', label: 'Recruiter Hub', icon: Building2 },
    { name: 'Mentor', path: '/mentor', key: 'mentor', label: 'Mentor Hub', icon: UserCheck },
    { name: 'Admin', path: '/admin', key: 'admin', label: 'Admin Console', icon: ShieldCheck },
  ];

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs gap-1 sm:gap-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 hidden md:inline">
          Workspace View:
        </span>
        <div className="flex items-center flex-1 gap-1" role="tablist">
          {roles.map((r) => {
            const Icon = r.icon;
            const isActive = activeRole === r.key;
            return (
              <button
                key={r.key}
                onClick={() => handleRoleSelect(r.name, r.path)}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                role="tab"
                aria-selected={isActive}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
