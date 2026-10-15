import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Sparkles,
  Users,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

export default function BottomNavBar({ activeTab }) {
  const { role } = useAuth();

  const studentTabs = [
    { name: 'Overview', path: '/student', icon: LayoutDashboard, id: 'overview' },
    { name: 'Matches', path: '/student/explore', icon: Briefcase, id: 'matches' },
    { name: 'Tasks', path: '/student/tasks', icon: CheckSquare, id: 'tasks' },
    { name: 'AI Coach', path: '/student/ai-coach', icon: Sparkles, id: 'ai-coach' },
  ];

  const companyTabs = [
    { name: 'Recruiter', path: '/company', icon: LayoutDashboard, id: 'overview' },
    { name: 'Candidates', path: '/company?view=applicants', icon: Users, id: 'matches' },
    { name: 'Roles', path: '/company?view=postings', icon: Briefcase, id: 'tasks' },
    { name: 'Explore', path: '/student/explore', icon: Sparkles, id: 'explore' },
  ];

  const mentorTabs = [
    { name: 'Supervise', path: '/mentor', icon: LayoutDashboard, id: 'overview' },
    { name: 'Interns', path: '/mentor', icon: GraduationCap, id: 'matches' },
    { name: 'Tasks', path: '/student/tasks', icon: CheckSquare, id: 'tasks' },
    { name: 'AI Refine', path: '/student/ai-coach', icon: Sparkles, id: 'ai-coach' },
  ];

  const adminTabs = [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard, id: 'overview' },
    { name: 'Verifications', path: '/admin', icon: ShieldCheck, id: 'matches' },
    { name: 'Postings', path: '/student/explore', icon: Briefcase, id: 'tasks' },
    { name: 'Studio', path: '/student/ai-coach', icon: Sparkles, id: 'ai-coach' },
  ];

  const tabs =
    role === 'company'
      ? companyTabs
      : role === 'mentor'
      ? mentorTabs
      : role === 'admin'
      ? adminTabs
      : studentTabs;

  return (
    <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-4 py-2 bg-white border-t border-slate-200 shadow-lg lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isSelected = activeTab ? activeTab === tab.id : false;
        return (
          <NavLink
            key={tab.id}
            to={tab.path}
            end={tab.path === '/student' || tab.path === '/company' || tab.path === '/mentor' || tab.path === '/admin'}
            className={({ isActive }) => {
              const active = isSelected || isActive;
              return active
                ? 'flex flex-col items-center justify-center text-indigo-600 font-bold px-3 py-1'
                : 'flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 px-3 py-1 font-medium';
            }}
          >
            {({ isActive }) => {
              const active = isSelected || isActive;
              return (
                <>
                  <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="text-[10px] mt-1">{tab.name}</span>
                </>
              );
            }}
          </NavLink>
        );
      })}
    </nav>
  );
}
