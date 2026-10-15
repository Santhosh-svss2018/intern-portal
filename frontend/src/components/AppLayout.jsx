import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationsModal from './NotificationsModal';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  CheckSquare,
  Sparkles,
  Users,
  GraduationCap,
  ShieldCheck,
  ClipboardList,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  User,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';

export default function AppLayout({ children, activeTab, title, breadcrumbs = [] }) {
  const { user, role, isAuthenticated, logout, switchDemoRole } = useAuth();
  const { unreadCount, toggleModal } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const handleRoleChange = async (targetRole, defaultPath) => {
    try {
      await switchDemoRole(targetRole);
      setMobileDrawerOpen(false);
      setProfileDropdownOpen(false);
      navigate(defaultPath);
    } catch (err) {
      console.error('Demo switch failed:', err);
    }
  };

  const handleLogout = () => {
    logout();
    setMobileDrawerOpen(false);
    setProfileDropdownOpen(false);
    navigate('/login');
  };

  // Role Navigation Items
  const studentNav = [
    { name: 'Dashboard', path: '/student', icon: LayoutDashboard, id: 'overview' },
    { name: 'Explore Internships', path: '/explore', icon: Briefcase, id: 'matches' },
    { name: 'My Applications', path: '/student/applications', icon: FileText, id: 'applications' },
    { name: 'Mentorship Tasks', path: '/student/tasks', icon: CheckSquare, id: 'tasks' },
    { name: 'AI Career Coach', path: '/student/ai-coach', icon: Sparkles, id: 'ai-coach' },
    { name: 'My Career Profile', path: '/student/profile', icon: User, id: 'profile' },
  ];

  const companyNav = [
    { name: 'Recruiter Hub', path: '/company', icon: LayoutDashboard, id: 'overview' },
    { name: 'Candidate Review', path: '/company?view=applicants', icon: Users, id: 'matches' },
    { name: 'Manage Postings', path: '/company?view=postings', icon: Briefcase, id: 'tasks' },
    { name: 'Explore Talent Pool', path: '/explore', icon: Search, id: 'explore' },
    { name: 'AI Question Studio', path: '/student/ai-coach', icon: Sparkles, id: 'ai-coach' },
  ];

  const mentorNav = [
    { name: 'Mentor Hub', path: '/mentor', icon: LayoutDashboard, id: 'overview' },
    { name: 'Assigned Mentees', path: '/mentor', icon: GraduationCap, id: 'matches' },
    { name: 'Deliverables Queue', path: '/mentor', icon: CheckSquare, id: 'tasks' },
    { name: 'Curriculum Tasks', path: '/student/tasks', icon: ClipboardList, id: 'curriculum' },
    { name: 'AI Feedback Refiner', path: '/student/ai-coach', icon: Sparkles, id: 'ai-coach' },
  ];

  const adminNav = [
    { name: 'Platform Console', path: '/admin', icon: LayoutDashboard, id: 'overview' },
    { name: 'User Management', path: '/admin?tab=users', icon: Users, id: 'users' },
    { name: 'Announcements', path: '/admin?tab=announcements', icon: ShieldCheck, id: 'announcements' },
    { name: 'Audit Telemetry', path: '/admin?tab=audits', icon: ClipboardList, id: 'audits' },
    { name: 'Browse Postings', path: '/explore', icon: Briefcase, id: 'explore' },
  ];

  const currentRoleKey = (role || '').toLowerCase();
  const navItems =
    currentRoleKey === 'company'
      ? companyNav
      : currentRoleKey === 'mentor'
      ? mentorNav
      : currentRoleKey === 'admin'
      ? adminNav
      : studentNav;

  const roleMeta = {
    student: { label: 'Student Candidate', badge: 'Student Workspace', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    company: { label: 'Enterprise Recruiter', badge: 'Recruiter Workspace', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    mentor: { label: 'Industry Advisor', badge: 'Mentor Workspace', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    admin: { label: 'Platform Administrator', badge: 'Admin Console', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  const currentMeta = roleMeta[currentRoleKey] || roleMeta.student;

  const getInitials = () => {
    if (user?.full_name) {
      const parts = user.full_name.trim().split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : user.full_name.slice(0, 2).toUpperCase();
    }
    return 'IC';
  };

  // If visitor is unauthenticated (e.g. browsing /explore or /internships/:id)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
        {/* PUBLIC TOP NAVIGATION BAR */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                <Sparkles className="w-5 h-5 text-teal-300" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">InternConnect</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  AI
                </span>
              </div>
            </Link>

            {/* Public Links */}
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
              <Link to="/explore" className="hover:text-indigo-600 transition-colors">
                Explore Internships
              </Link>
              <a href="/#how-it-works" className="hover:text-indigo-600 transition-colors">
                How It Works
              </a>
              <Link to="/login?role=company" className="hover:text-indigo-600 transition-colors">
                For Employers
              </Link>
            </nav>

            {/* Auth Actions */}
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-700 hover:text-indigo-600 px-3 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/login?mode=signup"
                className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-xs"
              >
                Get Started
              </Link>
            </div>
          </div>
        </header>

        {/* Public Content Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Public Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} InternConnect AI. Production-grade Internship Management Portal.
            </div>
            <div className="flex items-center gap-6">
              <Link to="/explore" className="hover:text-slate-900">Browse Roles</Link>
              <Link to="/login" className="hover:text-slate-900">Portal Login</Link>
              <span className="text-emerald-600 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Atlas Cluster0 Live
              </span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // AUTHENTICATED USER APPLICATION SHELL
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      <div className="flex flex-1">
        {/* DESKTOP COLLAPSIBLE SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200 bg-white sticky top-0 h-screen transition-all duration-200 z-30 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Brand Header */}
          <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
            <Link to="/" className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                <Sparkles className="w-5 h-5 text-teal-300" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-sm tracking-tight leading-snug">
                    InternConnect AI
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium truncate">
                    {currentMeta.badge}
                  </div>
                </div>
              )}
            </Link>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isItemActive =
                activeTab === item.id ||
                location.pathname === item.path ||
                (item.path.includes('?') &&
                  location.pathname === item.path.split('?')[0] &&
                  location.search === `?${item.path.split('?')[1]}`);

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isItemActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* User Account Footer */}
          <div className="p-3 border-t border-slate-200 shrink-0 bg-white">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-indigo-200">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span>{getInitials()}</span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-900 truncate leading-snug">{user?.full_name || 'User'}</div>
                    <div className="text-[11px] text-slate-500 truncate">{user?.email || 'user@internconnect.ai'}</div>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* MOBILE SLIDE-OVER DRAWER */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between p-4 z-10 border-r border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <Sparkles className="w-4 h-4 text-teal-300" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">InternConnect AI</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{currentMeta.label}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Navigation */}
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isItemActive =
                      activeTab === item.id ||
                      location.pathname === item.path ||
                      (item.path.includes('?') &&
                        location.pathname === item.path.split('?')[0] &&
                        location.search === `?${item.path.split('?')[1]}`);

                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isItemActive
                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isItemActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile Drawer Logout */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {getInitials()}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-900 truncate">{user?.full_name || 'User'}</div>
                    <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY AREA */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* TOP APP HEADER */}
          <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Title & Breadcrumbs */}
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span>Portal</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span className="capitalize">{role}</span>
                  {breadcrumbs.length > 0 &&
                    breadcrumbs.map((b, i) => (
                      <React.Fragment key={i}>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-700">{b}</span>
                      </React.Fragment>
                    ))}
                </div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight tracking-tight">
                  {title || 'Dashboard'}
                </h1>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Verified Workspace Badge */}
              <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${currentMeta.color}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                {currentMeta.badge}
              </span>

              {/* Notifications Bell */}
              <button
                onClick={toggleModal}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* User Avatar & Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs ring-1 ring-indigo-200">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span>{getInitials()}</span>
                    )}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {profileDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-fade-in"
                  >
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <div className="text-xs font-semibold text-slate-900 truncate">{user?.full_name || user?.email || 'Candidate User'}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                      <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${currentMeta.color}`}>
                        {currentMeta.label}
                      </span>
                    </div>

                    <div className="py-1 text-xs">
                      {role === 'student' && (
                        <Link
                          to="/student/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          My Career Profile
                        </Link>
                      )}
                      <Link
                        to="/explore"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        Explore Internships
                      </Link>

                      {/* Presentation Switcher Accordion (Real JWT Auth) */}
                      <div className="border-t border-slate-100 my-1 pt-1">
                        <button
                          onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                          className="w-full px-3.5 py-1.5 text-left text-[11px] text-slate-500 hover:text-slate-800 flex items-center justify-between cursor-pointer font-medium"
                        >
                          <span>Switch Presentation Persona</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${demoMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {demoMenuOpen && (
                          <div className="px-2 py-1 space-y-1 bg-slate-50 rounded-lg mx-2 mb-1 text-[11px]">
                            <button
                              onClick={() => handleRoleChange('student', '/student')}
                              className="w-full text-left px-2 py-1 rounded hover:bg-white text-slate-700 font-medium"
                            >
                              Alex Morgan (Student)
                            </button>
                            <button
                              onClick={() => handleRoleChange('company', '/company')}
                              className="w-full text-left px-2 py-1 rounded hover:bg-white text-slate-700 font-medium"
                            >
                              TechCorp Recruiter
                            </button>
                            <button
                              onClick={() => handleRoleChange('mentor', '/mentor')}
                              className="w-full text-left px-2 py-1 rounded hover:bg-white text-slate-700 font-medium"
                            >
                              Dr. Elena Vance (Mentor)
                            </button>
                            <button
                              onClick={() => handleRoleChange('admin', '/admin')}
                              className="w-full text-left px-2 py-1 rounded hover:bg-white text-slate-700 font-medium"
                            >
                              Platform SuperAdmin
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* PAGE CONTENT CONTAINER */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </div>
      </div>

      <NotificationsModal />
    </div>
  );
}
