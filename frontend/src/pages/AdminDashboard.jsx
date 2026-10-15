import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import {
  ShieldCheck,
  Shield,
  Users,
  Building2,
  CheckCircle2,
  Download,
  X,
  Activity,
  Check,
  UserPlus,
  KeyRound,
  UserCheck,
  Search,
  Megaphone,
  Send,
  Eye,
  Power,
  Lock,
} from 'lucide-react';

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validTabs = ['overview', 'users', 'announcements', 'audits'];
  const [activeTab, setActiveTab] = useState(() => (validTabs.includes(tabParam) ? tabParam : 'overview'));

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [stats, setStats] = useState({
    total_users: 0,
    students_count: 0,
    companies_count: 0,
    mentors_count: 0,
    admins_count: 0,
    active_users: 0,
    inactive_users: 0,
    verified_companies: 0,
    total_internships: 0,
    active_internships: 0,
    total_applications: 0,
    applications_by_status: {},
    interviews_count: 0,
    total_tasks: 0,
    completed_tasks: 0,
    task_completion_rate: 0,
    cluster_status: 'Cluster0 • MongoDB Atlas Live',
  });

  const [verifications, setVerifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [actionNotice, setActionNotice] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // USER MANAGEMENT STATE
  const [usersList, setUsersList] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [usersSkip, setUsersSkip] = useState(0);
  const usersLimit = 15;
  const [usersLoading, setUsersLoading] = useState(false);

  // Modals state
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('student');
  const [newUserOrg, setNewUserOrg] = useState('');
  const [newUserTitle, setNewUserTitle] = useState('');
  const [createError, setCreateError] = useState('');

  // Change Role Modal State
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [targetUserForRole, setTargetUserForRole] = useState(null);
  const [newRoleSelection, setNewRoleSelection] = useState('mentor');
  const [roleTitle, setRoleTitle] = useState('');
  const [roleOrg, setRoleOrg] = useState('');
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
  const [roleChangeError, setRoleChangeError] = useState('');

  // User detail modal
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Mentor assignment modal
  const [isAssignMentorOpen, setIsAssignMentorOpen] = useState(false);
  const [targetStudentForMentor, setTargetStudentForMentor] = useState(null);
  const [availableMentors, setAvailableMentors] = useState([]);
  const [selectedMentorId, setSelectedMentorId] = useState('');

  // Password reset modal (Admin-triggered)
  const [resetModalData, setResetModalData] = useState(null); // { email, reset_token, expires_at }

  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annAudience, setAnnAudience] = useState('all');
  const [annPriority, setAnnPriority] = useState('info');
  const annCategory = 'general';
  const [isSubmittingAnn, setIsSubmittingAnn] = useState(false);
  const [annError, setAnnError] = useState('');

  const fetchOverviewData = async () => {
    try {
      const [statsRes, verRes, logsRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: stats })),
        api.get('/admin/verifications').catch(() => ({ data: [] })),
        api.get('/admin/audit-logs').catch(() => ({ data: [] })),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (verRes.data) setVerifications(verRes.data);
      if (logsRes.data) setAuditLogs(logsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        skip: usersSkip.toString(),
        limit: usersLimit.toString(),
      });
      if (userSearch.trim()) params.append('search', userSearch.trim());
      if (userRoleFilter !== 'all') params.append('role', userRoleFilter);
      if (userStatusFilter !== 'all') params.append('is_active', userStatusFilter === 'active' ? 'true' : 'false');

      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.data) {
        setUsersList(res.data.users || []);
        setUsersTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/admin/announcements');
      if (res.data) setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMentors = async () => {
    try {
      const res = await api.get('/admin/mentors');
      if (res.data && Array.isArray(res.data)) {
        setAvailableMentors(res.data);
        if (res.data.length > 0) setSelectedMentorId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
  }, [activeTab, usersSkip, userRoleFilter, userStatusFilter]);

  const handleVerify = async (id, status) => {
    try {
      await api.patch(`/admin/verifications/${id}`, {
        company_id: id,
        status,
        notes: 'Verified via Admin Governance Console',
      });
      setActionNotice(`Company verification marked as ${status.toUpperCase()}!`);
      fetchOverviewData();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      await api.post('/admin/users', {
        full_name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword.trim() || undefined,
        role: newUserRole,
        organization: newUserOrg.trim(),
        title: newUserTitle.trim(),
      });
      setIsCreateUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserOrg('');
      setNewUserTitle('');
      setActionNotice(`🎉 Account for ${newUserEmail} provisioned successfully!`);
      fetchUsers();
      fetchOverviewData();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to create user account.');
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active;
    const confirmMsg = nextStatus
      ? `Activate user account for ${user.email}?`
      : `Deactivate user account for ${user.email}? They will no longer be able to log in.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/admin/users/${user.id}/status`, { is_active: nextStatus });
      setActionNotice(`User account ${nextStatus ? 'activated' : 'deactivated'} successfully.`);
      fetchUsers();
      fetchOverviewData();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInitiateReset = async (user) => {
    if (!window.confirm(`Initiate secure one-time password reset for ${user.email}?`)) return;
    try {
      const res = await api.post(`/admin/users/${user.id}/reset-password`);
      setResetModalData({
        email: user.email,
        reset_token: res.data.reset_token,
        expires_at: res.data.expires_at,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenChangeRole = (user) => {
    setTargetUserForRole(user);
    setNewRoleSelection(user.role === 'student' ? 'mentor' : user.role === 'mentor' ? 'student' : user.role);
    setRoleTitle(user.profile?.title || (user.role === 'student' ? 'Technical Mentor' : ''));
    setRoleOrg(user.profile?.organization || user.profile?.university || '');
    setRoleChangeError('');
    setIsChangeRoleOpen(true);
  };

  const handleConfirmChangeRole = async (e) => {
    e.preventDefault();
    if (!targetUserForRole) return;
    setRoleChangeLoading(true);
    setRoleChangeError('');
    try {
      await api.patch(`/admin/users/${targetUserForRole.id}/role`, {
        role: newRoleSelection,
        title: roleTitle.trim() || undefined,
        organization: roleOrg.trim() || undefined,
      });
      setIsChangeRoleOpen(false);
      setActionNotice(`🎉 User ${targetUserForRole.email} role updated to ${newRoleSelection.toUpperCase()}!`);
      fetchUsers();
      fetchOverviewData();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      setRoleChangeError(err.response?.data?.detail || 'Failed to update user role.');
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const handleOpenAssignMentor = (student) => {
    setTargetStudentForMentor(student);
    fetchMentors();
    setIsAssignMentorOpen(true);
  };

  const handleConfirmAssignMentor = async (e) => {
    e.preventDefault();
    if (!targetStudentForMentor || !selectedMentorId) return;
    try {
      await api.post('/admin/assignments', {
        student_id: targetStudentForMentor.id,
        mentor_id: selectedMentorId,
      });
      setIsAssignMentorOpen(false);
      setActionNotice(`Student successfully assigned to mentor!`);
      fetchUsers();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    setAnnError('');
    setIsSubmittingAnn(true);
    try {
      await api.post('/admin/announcements', {
        title: annTitle.trim(),
        message: annMessage.trim(),
        audience: annAudience,
        priority: annPriority,
        category: annCategory,
      });
      setActionNotice(`📢 Announcement published and dispatched to ${annAudience.toUpperCase()} audience!`);
      setAnnTitle('');
      setAnnMessage('');
      fetchAnnouncements();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      setAnnError(err.response?.data?.detail || 'Failed to publish announcement.');
    } finally {
      setIsSubmittingAnn(false);
    }
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/admin/export-report');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Governance-Compliance-Report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setActionNotice('📄 Platform Governance Report successfully downloaded!');
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppLayout activeTab="overview" title="Platform Governance & System Console" breadcrumbs={['Admin Console']}>
      <div className="space-y-6 animate-fade-in">
        {/* System Health Status Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center font-bold text-purple-700 shrink-0">
              <ShieldCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Platform Control Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Atlas Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cluster: Cluster0 • Target Database: <strong>internconnect_ai</strong> • Real DB Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReport}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generating...' : 'Export SOC2 Report'}</span>
            </button>
          </div>
        </div>

        {/* Global Action Alert */}
        {actionNotice && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-slide-up">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice('')} className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ADMIN TAB NAVIGATION BAR */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {[
            { id: 'overview', label: 'Platform Overview', icon: Activity },
            { id: 'users', label: 'User Management & RBAC', icon: Users, badge: stats.total_users },
            { id: 'announcements', label: 'Broadcast Announcements', icon: Megaphone },
            { id: 'audits', label: 'Audit Logs & Telemetry', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 6 GENUINE ADMIN KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
                <div className="mt-1.5 text-xl font-bold text-slate-900">{stats.total_users}</div>
                <div className="mt-1 text-[11px] text-emerald-600 font-semibold">{stats.active_users} active</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Students</span>
                <div className="mt-1.5 text-xl font-bold text-indigo-700">{stats.students_count}</div>
                <div className="mt-1 text-[11px] text-slate-500">Registered candidates</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employers</span>
                <div className="mt-1.5 text-xl font-bold text-blue-700">{stats.companies_count}</div>
                <div className="mt-1 text-[11px] text-blue-600 font-semibold">{stats.verified_companies} verified</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mentors</span>
                <div className="mt-1.5 text-xl font-bold text-teal-700">{stats.mentors_count}</div>
                <div className="mt-1 text-[11px] text-slate-500">Advisors</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Openings</span>
                <div className="mt-1.5 text-xl font-bold text-purple-700">{stats.active_internships}</div>
                <div className="mt-1 text-[11px] text-slate-500">{stats.total_internships} total roles</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submissions</span>
                <div className="mt-1.5 text-xl font-bold text-amber-700">{stats.total_applications}</div>
                <div className="mt-1 text-[11px] text-amber-700 font-semibold">{stats.interviews_count} in interview</div>
              </div>
            </div>

            {/* 2-COLUMN GOVERNANCE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Verification Queue Card */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">Employer Verification Queue</h3>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {verifications.length} Pending Compliance Review
                    </span>
                  </div>

                  {verifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      All employer registrations are verified and compliant.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                            <th className="pb-2.5 font-bold">Organization</th>
                            <th className="pb-2.5 font-bold">Domain</th>
                            <th className="pb-2.5 font-bold">Status</th>
                            <th className="pb-2.5 font-bold text-right">Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {verifications.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/50">
                              <td className="py-3 font-semibold text-slate-900">{v.company_name}</td>
                              <td className="py-3 text-slate-500">{v.domain || 'Registered organization'}</td>
                              <td className="py-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                                  {v.verification_status || 'Pending'}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleVerify(v.company_id || v.id, 'rejected')}
                                    className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-slate-50 font-semibold transition-colors cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleVerify(v.company_id || v.id, 'verified')}
                                    className="px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 font-semibold transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    Approve
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pipeline Stats Breakdown */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                    Application Lifecycle Funnel (MongoDB Records)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      { key: 'applied', label: 'Applied', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                      { key: 'in_review', label: 'In Review', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                      { key: 'shortlisted', label: 'Shortlisted', color: 'bg-teal-50 border-teal-200 text-teal-700' },
                      { key: 'interview', label: 'Interview Scheduled', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                      { key: 'accepted', label: 'Selected / Offer', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                      { key: 'rejected', label: 'Archived / Rejected', color: 'bg-rose-50 border-rose-200 text-rose-700' },
                    ].map((st) => (
                      <div key={st.key} className={`p-3 rounded-lg border ${st.color}`}>
                        <div className="text-[11px] font-bold">{st.label}</div>
                        <div className="text-xl font-bold mt-1">
                          {stats.applications_by_status?.[st.key] || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 2: Demographics & Tasks */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                    User Distribution (Real Atlas Counts)
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-700">Students</span>
                        <span className="font-bold text-indigo-700">{stats.students_count} users</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${stats.total_users > 0 ? (stats.students_count / stats.total_users) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-700">Recruiters</span>
                        <span className="font-bold text-blue-700">{stats.companies_count} users</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${stats.total_users > 0 ? (stats.companies_count / stats.total_users) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-700">Mentors</span>
                        <span className="font-bold text-teal-700">{stats.mentors_count} users</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-teal-600 h-2 rounded-full"
                          style={{ width: `${stats.total_users > 0 ? (stats.mentors_count / stats.total_users) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-700">SuperAdmins</span>
                        <span className="font-bold text-purple-700">{stats.admins_count} users</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${stats.total_users > 0 ? (stats.admins_count / stats.total_users) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mentorship Health */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                    Mentorship Progress Telemetry
                  </h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Total Assigned Deliverables:</span>
                    <span className="font-bold text-slate-900">{stats.total_tasks}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Approved & Merged:</span>
                    <span className="font-bold text-emerald-600">{stats.completed_tasks}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Task Completion Rate:</span>
                    <span className="font-bold text-indigo-600">{stats.task_completion_rate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT & RBAC */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Platform User Directory</h3>
                <p className="text-xs text-slate-500">Manage real user accounts, roles, statuses, and mentor assignments</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreateUserOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Provision New User</span>
                </button>
              </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  placeholder="Search by full name or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUsersSkip(0);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="company">Recruiters / Companies</option>
                  <option value="mentor">Mentors</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>

              <div>
                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUsersSkip(0);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5 font-bold">User Identity</th>
                    <th className="pb-2.5 font-bold">Role</th>
                    <th className="pb-2.5 font-bold">Status</th>
                    <th className="pb-2.5 font-bold">Assigned Mentor</th>
                    <th className="pb-2.5 font-bold">Joined</th>
                    <th className="pb-2.5 font-bold text-right">Governance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersLoading ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">Loading user directory...</td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">No matching user accounts found.</td>
                    </tr>
                  ) : (
                    usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="py-3">
                          <div className="font-semibold text-slate-900">{u.full_name || 'Anonymous User'}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : u.role === 'mentor'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : u.role === 'company'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {u.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600">
                          {u.role === 'student' ? (
                            u.assigned_mentor_name ? (
                              <span className="font-medium text-teal-700">{u.assigned_mentor_name}</span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 text-slate-400 text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Initial Seed'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Profile Detail Button */}
                            <button
                              onClick={() => {
                                setSelectedUserDetail(u);
                                setIsDetailOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[10px] cursor-pointer flex items-center gap-1"
                              title="Inspect User Details"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              View
                            </button>

                            {/* Change Role Button */}
                            <button
                              onClick={() => handleOpenChangeRole(u)}
                              className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-[10px] cursor-pointer flex items-center gap-1"
                              title="Change User Role (e.g. Promote Student to Mentor)"
                            >
                              <Shield className="w-3 h-3 text-indigo-600" />
                              Role
                            </button>

                            {/* Assign Mentor Button (Students only) */}
                            {u.role === 'student' && (
                              <button
                                onClick={() => handleOpenAssignMentor(u)}
                                className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-semibold text-[10px] cursor-pointer"
                                title="Assign / Reassign Mentor"
                              >
                                Assign Mentor
                              </button>
                            )}

                            {/* Reset Password Button */}
                            <button
                              onClick={() => handleInitiateReset(u)}
                              className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[10px] cursor-pointer flex items-center gap-1"
                              title="Generate One-time Password Reset Token"
                            >
                              <KeyRound className="w-3 h-3 text-slate-500" />
                              Reset Pass
                            </button>

                            {/* Toggle Active/Inactive */}
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1 rounded cursor-pointer ${
                                u.is_active
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div>
                Showing {Math.min(usersTotal, usersSkip + 1)} - {Math.min(usersTotal, usersSkip + usersLimit)} of {usersTotal} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={usersSkip === 0}
                  onClick={() => setUsersSkip((prev) => Math.max(0, prev - usersLimit))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-medium"
                >
                  Previous
                </button>
                <button
                  disabled={usersSkip + usersLimit >= usersTotal}
                  onClick={() => setUsersSkip((prev) => prev + usersLimit)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Announcement Composer */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Megaphone className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Broadcast Platform Announcement</h3>
              </div>

              {annError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 rounded-lg text-xs font-medium">
                  {annError}
                </div>
              )}

              <form onSubmit={handlePostAnnouncement} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={annAudience}
                    onChange={(e) => setAnnAudience(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
                  >
                    <option value="all">📢 All Users (Students, Employers, Mentors)</option>
                    <option value="student">🎓 Students Only</option>
                    <option value="company">🏢 Employers / Recruiters Only</option>
                    <option value="mentor">🧑‍🏫 Mentors Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Announcement Title</label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    required
                    placeholder="e.g. Summer 2025 Internship Application Deadline Extended"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'info', label: 'Info' },
                      { id: 'warning', label: 'Important' },
                      { id: 'urgent', label: 'Urgent' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAnnPriority(p.id)}
                        className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          annPriority === p.id
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Announcement Message</label>
                  <textarea
                    rows={4}
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    required
                    placeholder="Compose announcement body... This will appear in the notification center for users matching the selected audience."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAnn}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingAnn ? 'Dispatching...' : 'Dispatch Announcement'}</span>
                </button>
              </form>
            </div>

            {/* Announcement History */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Broadcast History</h3>
                <span className="text-xs text-slate-500 font-medium">{announcements.length} Sent</span>
              </div>

              {announcements.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No announcements published yet. Use the composer to broadcast alerts.
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{a.title}</h4>
                            <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                              a.priority === 'urgent'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : a.priority === 'warning'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {a.priority}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{a.message}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase shrink-0">
                          Audience: {a.audience}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Dispatched to {a.recipient_count || 0} active accounts</span>
                        <span>{a.created_at_display || new Date(a.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'audits' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Platform Security Audit Log</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Real-time Telemetry</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5 font-bold">Timestamp</th>
                    <th className="pb-2.5 font-bold">Principal</th>
                    <th className="pb-2.5 font-bold">Action / Event</th>
                    <th className="pb-2.5 font-bold text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log, i) => (
                      <tr key={log.id || i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 text-slate-400 font-mono text-[11px]">{log.timestamp}</td>
                        <td className="py-2.5 font-medium text-slate-700">{log.actor}</td>
                        <td className="py-2.5 text-slate-900">{log.event || log.title}</td>
                        <td className="py-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.severity === 'success'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.severity === 'warning'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {log.severity || 'info'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-xs text-slate-400">
                        No audit activity recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Provision User Account</h3>
              </div>
              <button onClick={() => setIsCreateUserOpen(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-2.5 bg-rose-50 text-rose-800 rounded-lg text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
                >
                  <option value="student">Student Candidate</option>
                  <option value="company">Corporate Recruiter</option>
                  <option value="mentor">Academic / Industry Mentor</option>
                  <option value="admin">Platform SuperAdmin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required
                  placeholder="e.g. Maya Lin"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  placeholder="user@domain.edu"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-slate-400 font-normal">(Leave blank to auto-generate)</span>
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Auto-generated secure password if blank"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {newUserRole === 'student' ? 'University / College' : newUserRole === 'company' ? 'Organization' : 'Affiliation'}
                </label>
                <input
                  type="text"
                  value={newUserOrg}
                  onChange={(e) => setNewUserOrg(e.target.value)}
                  placeholder="e.g. Stanford University or Stripe"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN MENTOR MODAL */}
      {isAssignMentorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">Assign Mentor</h3>
              </div>
              <button onClick={() => setIsAssignMentorOpen(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Assign a dedicated mentor to supervise <strong>{targetStudentForMentor?.full_name}</strong> ({targetStudentForMentor?.email}).
            </p>

            <form onSubmit={handleConfirmAssignMentor} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Active Mentor</label>
                <select
                  value={selectedMentorId}
                  onChange={(e) => setSelectedMentorId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {availableMentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email}) • {m.assigned_count} active mentees
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignMentorOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shadow-xs"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONE-TIME PASSWORD RESET TOKEN MODAL */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Reset Token Generated</h3>
              </div>
              <button onClick={() => setResetModalData(null)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              A single-use password reset token has been created for <strong>{resetModalData.email}</strong>. Valid for 1 hour.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">One-Time Token</div>
              <div className="font-mono text-xs text-indigo-700 break-all select-all font-semibold">
                {resetModalData.reset_token}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setResetModalData(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* USER DETAIL INSPECTION MODAL */}
      {isDetailOpen && selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">User Account Inspection</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Full Name</div>
                  <div className="font-semibold text-slate-900 text-sm mt-0.5">{selectedUserDetail.full_name || 'Anonymous User'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Email Address</div>
                  <div className="font-mono text-slate-700 mt-0.5">{selectedUserDetail.email}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Assigned Role</div>
                  <div className="font-bold text-indigo-700 uppercase mt-0.5">{selectedUserDetail.role}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Account Status</div>
                  <div className={`font-semibold mt-0.5 ${selectedUserDetail.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {selectedUserDetail.is_active ? 'Active' : 'Deactivated'}
                  </div>
                </div>
              </div>

              {selectedUserDetail.role === 'student' && (
                <div className="space-y-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                  <div className="font-bold text-indigo-900 text-xs">Academic & Career Profile</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">University:</span>{' '}
                      <strong>{selectedUserDetail.profile?.university || 'Not set'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Degree:</span>{' '}
                      <strong>{selectedUserDetail.profile?.degree || 'Not set'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Readiness Score:</span>{' '}
                      <strong>{selectedUserDetail.profile?.readiness_score || 0}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Assigned Mentor:</span>{' '}
                      <strong>{selectedUserDetail.assigned_mentor_name || 'None'}</strong>
                    </div>
                  </div>
                  {selectedUserDetail.profile?.skills && selectedUserDetail.profile.skills.length > 0 && (
                    <div className="pt-1">
                      <span className="text-slate-500 text-[10px]">Skills: </span>
                      <span className="font-medium text-slate-800 text-[11px]">
                        {selectedUserDetail.profile.skills.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedUserDetail.role === 'company' && (
                <div className="space-y-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                  <div className="font-bold text-blue-900 text-xs">Company Profile</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Organization:</span>{' '}
                      <strong>{selectedUserDetail.profile?.company_name || selectedUserDetail.full_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Tier:</span>{' '}
                      <strong>{selectedUserDetail.profile?.tier || 'Standard'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {selectedUserDetail.role === 'mentor' && (
                <div className="space-y-2 p-3 bg-teal-50/50 border border-teal-100 rounded-lg">
                  <div className="font-bold text-teal-900 text-xs">Mentor Profile</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Title:</span>{' '}
                      <strong>{selectedUserDetail.profile?.title || 'Technical Advisor'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Organization:</span>{' '}
                      <strong>{selectedUserDetail.profile?.organization || 'Independent'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE USER ROLE MODAL */}
      {isChangeRoleOpen && targetUserForRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Change User Role</h3>
              </div>
              <button
                onClick={() => setIsChangeRoleOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="font-semibold text-slate-900">{targetUserForRole.full_name}</div>
              <div className="text-slate-500 font-mono text-[11px]">{targetUserForRole.email}</div>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-slate-500 text-[10px]">Current Role:</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                  {targetUserForRole.role}
                </span>
              </div>
            </div>

            {roleChangeError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
                {roleChangeError}
              </div>
            )}

            <form onSubmit={handleConfirmChangeRole} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Platform Role</label>
                <select
                  value={newRoleSelection}
                  onChange={(e) => setNewRoleSelection(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
                >
                  <option value="student">Student</option>
                  <option value="mentor">Academic / Technical Mentor</option>
                  <option value="company">Corporate Recruiter</option>
                  <option value="admin">Platform Administrator</option>
                </select>
              </div>

              {newRoleSelection === 'mentor' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mentor Title / Position</label>
                    <input
                      type="text"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      placeholder="e.g. Lead Technical Mentor or Adjunct Faculty"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Organization</label>
                    <input
                      type="text"
                      value={roleOrg}
                      onChange={(e) => setRoleOrg(e.target.value)}
                      placeholder="e.g. Computer Science Department or Google"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <p className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 p-2.5 rounded-lg leading-relaxed">
                    💡 <strong>Direct Promotion:</strong> This user will immediately receive mentor permissions to supervise assigned students and review tasks without any approval queue.
                  </p>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangeRoleOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleChangeLoading || newRoleSelection === targetUserForRole.role}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {roleChangeLoading ? 'Updating Role...' : 'Save Role Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
