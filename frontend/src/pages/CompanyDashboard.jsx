import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import CandidateDetailModal from '../components/CandidateDetailModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Plus,
  Users,
  Briefcase,
  Star,
  Video,
  Sparkles,
  CheckCircle2,
  X,
  MapPin,
  Calendar,
  Search,
  Filter,
  Columns3,
  TrendingUp,
  CheckSquare,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  UserCheck,
  Award,
  Layers,
} from 'lucide-react';

const KANBAN_STAGES = [
  { key: 'applied', label: 'Applied', color: 'border-t-slate-400 bg-slate-50/70', badge: 'bg-slate-100 text-slate-800' },
  { key: 'screening', label: 'Screening', color: 'border-t-blue-500 bg-blue-50/30', badge: 'bg-blue-50 text-blue-700' },
  { key: 'shortlisted', label: 'Shortlisted', color: 'border-t-teal-500 bg-teal-50/30', badge: 'bg-teal-50 text-teal-700' },
  { key: 'interview', label: 'Interview', color: 'border-t-indigo-500 bg-indigo-50/30', badge: 'bg-indigo-50 text-indigo-700' },
  { key: 'offer', label: 'Offer', color: 'border-t-emerald-500 bg-emerald-50/30', badge: 'bg-emerald-50 text-emerald-700' },
  { key: 'hired', label: 'Hired', color: 'border-t-purple-500 bg-purple-50/30', badge: 'bg-purple-50 text-purple-700' },
  { key: 'rejected', label: 'Rejected', color: 'border-t-rose-400 bg-rose-50/30', badge: 'bg-rose-50 text-rose-700' },
];

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');

  // Active view tab: kanban, candidates, analytics, tasks, postings
  const [activeTab, setActiveTab] = useState(() => {
    if (viewParam === 'postings') return 'postings';
    if (viewParam === 'candidates' || viewParam === 'applicants') return 'candidates';
    return 'kanban';
  });

  useEffect(() => {
    if (viewParam === 'postings') setActiveTab('postings');
    else if (viewParam === 'candidates' || viewParam === 'applicants') setActiveTab('candidates');
  }, [viewParam]);

  // Data states
  const [pipelineData, setPipelineData] = useState({ stages: {}, stage_counts: {}, total_candidates: 0 });
  const [candidatesList, setCandidatesList] = useState([]);
  const [candidatesTotal, setCandidatesTotal] = useState(0);
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesTotalPages, setCandidatesTotalPages] = useState(1);
  const [postings, setPostings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pendingFollowups, setPendingFollowups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters for Candidate Directory & Kanban
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');
  const [selectedPostingFilter, setSelectedPostingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [viewMode, setViewMode] = useState('table'); // table or cards

  // Candidate Detail Drawer / Modal
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Post Role Modal
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('Remote');
  const [newMode, setNewMode] = useState('Remote');
  const [newStipend, setNewStipend] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [actionNotice, setActionNotice] = useState('');

  const showToast = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 4500);
  };

  const fetchCRMData = async () => {
    setLoading(true);
    try {
      const [pipeRes, postRes, anaRes, folRes] = await Promise.all([
        api.get('/crm/pipeline').catch(() => ({ data: { stages: {}, stage_counts: {}, total_candidates: 0 } })),
        api.get('/internships/my/postings').catch(() => api.get('/internships').catch(() => ({ data: [] }))),
        api.get('/crm/analytics').catch(() => ({ data: null })),
        api.get('/crm/pending-followups').catch(() => ({ data: [] })),
      ]);

      if (pipeRes.data) setPipelineData(pipeRes.data);
      if (postRes.data) setPostings(postRes.data);
      if (anaRes.data) setAnalytics(anaRes.data);
      if (folRes.data) setPendingFollowups(folRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidatesDirectory = async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '8',
        sort_by: sortBy,
      });
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedStageFilter !== 'all') params.append('stage', selectedStageFilter);
      if (selectedPostingFilter !== 'all') params.append('internship_id', selectedPostingFilter);

      const res = await api.get(`/crm/candidates?${params.toString()}`);
      if (res.data) {
        setCandidatesList(res.data.candidates);
        setCandidatesTotal(res.data.total);
        setCandidatesPage(res.data.page);
        setCandidatesTotalPages(res.data.total_pages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCRMData();
  }, []);

  useEffect(() => {
    fetchCandidatesDirectory(candidatesPage);
  }, [searchQuery, selectedStageFilter, selectedPostingFilter, sortBy, candidatesPage]);

  const handleOpenCandidate = (candidateId) => {
    setSelectedCandidateId(candidateId);
    setIsDetailOpen(true);
  };

  const handleQuickMoveStage = async (e, candidateId, newStage, currentStage) => {
    e.stopPropagation();
    try {
      await api.patch(`/crm/candidates/${candidateId}/stage`, {
        stage: newStage,
        feedback: `Quick transition to ${newStage.toUpperCase()} in Kanban`,
        current_stage: currentStage,
      });
      showToast(`Candidate moved to ${newStage.toUpperCase()}!`);
      fetchCRMData();
      fetchCandidatesDirectory(candidatesPage);
    } catch (err) {
      showToast(`Error: ${err.response?.data?.detail || 'Failed to move candidate'}`);
    }
  };

  const handleToggleTaskQuick = async (candidateId, taskId, currentVal) => {
    try {
      await api.patch(`/crm/candidates/${candidateId}/tasks/${taskId}`, {
        completed: !currentVal,
      });
      showToast('Task status updated.');
      fetchCRMData();
    } catch (err) {
      showToast('Failed to update task.');
    }
  };

  const handlePostRole = async (e) => {
    e.preventDefault();
    try {
      const skillsArr = newSkills.split(',').map((s) => s.trim()).filter(Boolean);
      await api.post('/internships', {
        title: newTitle,
        company_name: user?.full_name || (user?.email ? user.email.split('@')[0].toUpperCase() : 'Registered Employer'),
        location: newLocation,
        work_mode: newMode,
        stipend: newStipend,
        skills_required: skillsArr,
        description: newDescription || 'Engineering internship opportunity with cutting edge tooling.',
        deadline: 'Applications close in 2 weeks',
      });
      showToast('🎉 New internship opportunity published!');
      setIsPostModalOpen(false);
      setNewTitle('');
      setNewStipend('');
      setNewSkills('');
      setNewDescription('');
      fetchCRMData();
    } catch (err) {
      console.error(err);
      showToast('Failed to publish opportunity.');
    }
  };

  const handleClosePosting = async (id) => {
    try {
      await api.delete(`/internships/${id}`);
      showToast('Posting closed.');
      fetchCRMData();
    } catch (err) {
      showToast('Failed to close posting.');
    }
  };

  // Filter Kanban candidates by search or posting filter if active
  const filterKanbanCandidates = (cards) => {
    if (!cards || !Array.isArray(cards)) return [];
    return cards.filter((c) => {
      if (selectedPostingFilter !== 'all' && c.internship_id !== selectedPostingFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.student_name?.toLowerCase().includes(q);
        const matchesUni = c.student_university?.toLowerCase().includes(q);
        const matchesSkill = c.skills?.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesUni && !matchesSkill) return false;
      }
      return true;
    });
  };

  return (
    <AppLayout activeTab="overview" title="Recruiter Talent CRM" breadcrumbs={['Recruiter Workspace', 'Talent CRM']}>
      <div className="space-y-6 animate-fade-in">
        {/* RECRUITER HEADER BANNER */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-base shadow-2xs">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  {user?.full_name || (user?.email ? user.email.split('@')[0].toUpperCase() : 'Employer Portal')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                  Recruiter CRM Workspace
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {pipelineData.total_candidates} Pipeline Candidates • {postings.length} Active Opportunities • {pendingFollowups.length} Pending Follow-ups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Post Opportunity</span>
            </button>
          </div>
        </div>

        {/* GLOBAL ACTION NOTICE */}
        {actionNotice && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-slide-up">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice('')} className="p-1 text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 CORE METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pipeline</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">{pipelineData.total_candidates}</div>
            <div className="mt-1 text-xs text-indigo-600 font-medium">Across all active stages</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-teal-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shortlisted</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-teal-700 tracking-tight">
              {pipelineData.stage_counts?.shortlisted || 0}
            </div>
            <div className="mt-1 text-xs text-teal-700 font-medium">Screening passed & queued</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interviews & Offers</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-700 tracking-tight">
              {(pipelineData.stage_counts?.interview || 0) + (pipelineData.stage_counts?.offer || 0)}
            </div>
            <div className="mt-1 text-xs text-purple-600 font-medium">
              {pipelineData.stage_counts?.interview || 0} interviews • {pipelineData.stage_counts?.offer || 0} offers
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Follow-ups</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700 tracking-tight">{pendingFollowups.length}</div>
            <div className="mt-1 text-xs text-amber-700 font-medium">
              {analytics?.overdue_tasks_count ? `${analytics.overdue_tasks_count} overdue` : 'All tasks on schedule'}
            </div>
          </div>
        </div>

        {/* MAIN VIEW NAVIGATION TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {[
              { id: 'kanban', label: 'Pipeline Kanban', icon: Columns3, badge: pipelineData.total_candidates },
              { id: 'candidates', label: 'Candidate Directory', icon: Users, badge: candidatesTotal },
              { id: 'analytics', label: 'Funnel Analytics', icon: TrendingUp },
              { id: 'tasks', label: 'Follow-ups & Reminders', icon: CheckSquare, badge: pendingFollowups.length },
              { id: 'postings', label: 'Job Postings', icon: Briefcase, badge: postings.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Filters for Kanban and Directory */}
          {(activeTab === 'kanban' || activeTab === 'candidates') && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter name, skills..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 w-44"
                />
              </div>

              <select
                value={selectedPostingFilter}
                onChange={(e) => setSelectedPostingFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 max-w-[150px] truncate"
              >
                <option value="all">All Opportunities</option>
                {postings.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: RECRUITMENT KANBAN BOARD */}
        {/* ========================================================================= */}
        {activeTab === 'kanban' && (
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex items-start gap-4 min-w-[1400px]">
              {KANBAN_STAGES.map((col) => {
                const stageCards = filterKanbanCandidates(pipelineData.stages?.[col.key]);
                return (
                  <div
                    key={col.key}
                    className={`flex-1 rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col max-h-[75vh] border-t-4 ${col.color}`}
                  >
                    {/* Column Header */}
                    <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{col.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badge}`}>
                          {stageCards.length}
                        </span>
                      </div>
                    </div>

                    {/* Column Cards Container */}
                    <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar min-h-[220px]">
                      {stageCards.length === 0 ? (
                        <div className="p-6 text-center text-[11px] text-slate-400 italic">
                          No candidates in {col.label.toLowerCase()}
                        </div>
                      ) : (
                        stageCards.map((cand) => (
                          <div
                            key={cand.id}
                            onClick={() => handleOpenCandidate(cand.id)}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm hover:border-indigo-300 transition-all cursor-pointer space-y-2.5 group"
                          >
                            {/* Card Top: Avatar & Name */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs shrink-0 overflow-hidden">
                                  {cand.student_avatar ? (
                                    <img src={cand.student_avatar} alt={cand.student_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{cand.student_name?.slice(0, 2).toUpperCase() || 'ST'}</span>
                                  )}
                                </div>
                                <div className="overflow-hidden">
                                  <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                    {cand.student_name}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 truncate">{cand.student_university || 'Student'}</p>
                                </div>
                              </div>

                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                                <Sparkles className="w-2.5 h-2.5" />
                                {cand.ai_match_percentage}%
                              </span>
                            </div>

                            {/* Role Title */}
                            <div className="text-[11px] font-semibold text-slate-700 truncate">
                              {cand.internship_title}
                            </div>

                            {/* Skills Pills */}
                            <div className="flex flex-wrap gap-1">
                              {cand.skills?.slice(0, 3).map((sk) => (
                                <span key={sk} className="px-1.5 py-0.2 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[10px]">
                                  {sk}
                                </span>
                              ))}
                              {cand.skills?.length > 3 && (
                                <span className="text-[10px] text-slate-400 font-semibold">+{cand.skills.length - 3}</span>
                              )}
                            </div>

                            {/* Scheduled Interview Ribbon if applicable */}
                            {cand.interview_date && (
                              <div className="p-1.5 bg-indigo-50/80 rounded-lg border border-indigo-100 text-[10px] font-semibold text-indigo-900 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span className="truncate">{cand.interview_date}</span>
                              </div>
                            )}

                            {/* Card Footer: Metadata & Quick Move */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                              <div className="flex items-center gap-2">
                                {cand.notes_count > 0 && (
                                  <span className="flex items-center gap-0.5 font-medium text-slate-500">
                                    📝 {cand.notes_count}
                                  </span>
                                )}
                                {cand.pending_tasks_count > 0 && (
                                  <span className="flex items-center gap-0.5 font-bold text-amber-600">
                                    ⏱ {cand.pending_tasks_count}
                                  </span>
                                )}
                              </div>

                              {/* Quick Stage Move Dropdown */}
                              <select
                                value={col.key}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleQuickMoveStage(e, cand.id, e.target.value, col.key)}
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer hover:bg-slate-100"
                              >
                                <option value="" disabled>Move...</option>
                                {KANBAN_STAGES.map((s) => (
                                  <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: CANDIDATE DIRECTORY (MANAGEMENT PAGE) */}
        {/* ========================================================================= */}
        {activeTab === 'candidates' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Filter Stage:</span>
                {['all', 'applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => { setSelectedStageFilter(st); setCandidatesPage(1); }}
                    className={`px-3 py-1 rounded-lg capitalize font-semibold transition-all cursor-pointer ${
                      selectedStageFilter === st
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                >
                  <option value="date_desc">Latest Applied</option>
                  <option value="match_desc">Highest AI Fit</option>
                  <option value="name_asc">Candidate Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Candidate</th>
                      <th className="px-5 py-3.5">Target Opportunity</th>
                      <th className="px-5 py-3.5">AI Fit</th>
                      <th className="px-5 py-3.5">Current Stage</th>
                      <th className="px-5 py-3.5">Key Skills</th>
                      <th className="px-5 py-3.5">CRM Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidatesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p>No candidates match your current search and stage criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      candidatesList.map((cand) => (
                        <tr
                          key={cand.id}
                          onClick={() => handleOpenCandidate(cand.id)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-indigo-700 text-xs shrink-0 overflow-hidden">
                                {cand.student_avatar ? (
                                  <img src={cand.student_avatar} alt={cand.student_name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{cand.student_name?.slice(0, 2).toUpperCase() || 'ST'}</span>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {cand.student_name}
                                </div>
                                <div className="text-[11px] text-slate-400">{cand.student_university || 'Candidate'}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {cand.internship_title}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                              <Sparkles className="w-3 h-3 text-teal-600" />
                              {cand.ai_match_percentage}%
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              {cand.stage}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {cand.skills?.slice(0, 3).map((sk) => (
                                <span key={sk} className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px]">
                                  {sk}
                                </span>
                              ))}
                              {cand.skills?.length > 3 && (
                                <span className="text-[10px] text-slate-400 font-semibold">+{cand.skills.length - 3}</span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenCandidate(cand.id); }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View CRM</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {candidatesTotalPages > 1 && (
                <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 px-5">
                  <div>
                    Page <strong className="text-slate-800">{candidatesPage}</strong> of{' '}
                    <strong className="text-slate-800">{candidatesTotalPages}</strong> ({candidatesTotal} total candidates)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCandidatesPage((p) => Math.max(1, p - 1))}
                      disabled={candidatesPage <= 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 cursor-pointer hover:bg-slate-50 flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button
                      onClick={() => setCandidatesPage((p) => Math.min(candidatesTotalPages, p + 1))}
                      disabled={candidatesPage >= candidatesTotalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 cursor-pointer hover:bg-slate-50 flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: PIPELINE CONVERSION ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6 animate-fade-in">
            {/* Conversion Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Screening Rate', value: analytics.screening_rate, sub: 'Passed initial review' },
                { label: 'Shortlist Rate', value: analytics.shortlist_rate, sub: 'Advanced to pool' },
                { label: 'Interview Rate', value: analytics.interview_rate, sub: 'Live round scheduled' },
                { label: 'Offer Rate', value: analytics.offer_rate, sub: 'Extended offers' },
                { label: 'Hire Rate', value: analytics.hire_rate, sub: 'Offer accepted' },
                { label: 'Overall Yield', value: analytics.overall_hire_rate, sub: 'Total applicant yield' },
              ].map((m, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</span>
                  <div className="text-xl font-bold text-indigo-700 mt-1 tracking-tight">{m.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Visual Recruitment Funnel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>End-to-End Pipeline Funnel</span>
              </h3>

              <div className="space-y-3 pt-2">
                {[
                  { label: '1. Applications Received', count: analytics.total_candidates, color: 'bg-slate-500' },
                  { label: '2. Screening Assessment', count: analytics.screening_count + analytics.shortlisted_count + analytics.interview_count + analytics.offer_count + analytics.hired_count, color: 'bg-blue-600' },
                  { label: '3. Shortlisted Candidates', count: analytics.shortlisted_count + analytics.interview_count + analytics.offer_count + analytics.hired_count, color: 'bg-teal-600' },
                  { label: '4. Interviews Conducted', count: analytics.interview_count + analytics.offer_count + analytics.hired_count, color: 'bg-indigo-600' },
                  { label: '5. Offers Extended', count: analytics.offer_count + analytics.hired_count, color: 'bg-emerald-600' },
                  { label: '6. Hired & Finalized', count: analytics.hired_count, color: 'bg-purple-600' },
                ].map((step, sIdx) => {
                  const pct = analytics.total_candidates > 0 ? Math.round((step.count / analytics.total_candidates) * 100) : 0;
                  return (
                    <div key={sIdx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{step.label}</span>
                        <span className="font-bold text-slate-900">{step.count} candidates ({pct}%)</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${step.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: FOLLOW-UP TASKS & REMINDERS */}
        {/* ========================================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Recruiter Action Queue ({pendingFollowups.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tasks and reminders linked directly to active candidates in your pipeline.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {pendingFollowups.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">All caught up!</p>
                    <p className="mt-0.5">No pending candidate follow-up tasks currently in queue.</p>
                  </div>
                ) : (
                  pendingFollowups.map((task) => (
                    <div
                      key={task.task_id}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleTaskQuick(task.application_id, task.task_id, false)}
                          className="w-5 h-5 rounded border border-slate-300 bg-white hover:border-indigo-600 flex items-center justify-center cursor-pointer text-white hover:text-indigo-600"
                        >
                          ✓
                        </button>
                        <div>
                          <p className="font-bold text-slate-900">{task.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Candidate: <button onClick={() => handleOpenCandidate(task.application_id)} className="text-indigo-600 font-semibold hover:underline cursor-pointer">{task.candidate_name}</button> • {task.internship_title}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        {task.due_date && (
                          <span className={`flex items-center gap-1 font-semibold text-[11px] ${task.is_overdue ? 'text-rose-600' : 'text-slate-500'}`}>
                            {task.is_overdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                            Due {task.due_date}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          task.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: MANAGE JOB POSTINGS */}
        {/* ========================================================================= */}
        {activeTab === 'postings' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {postings.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-slate-900">{p.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.location || 'San Francisco, CA'} ({p.work_mode || 'Remote'})</span>
                    </p>
                    <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                      {p.description || 'Full-stack engineering role building high-throughput production services.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{p.stipend || '$50/hr'}</span>
                    <button
                      onClick={() => handleClosePosting(p.id)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                    >
                      Close Posting
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CANDIDATE CRM DETAIL DRAWER / MODAL */}
        <CandidateDetailModal
          candidateId={selectedCandidateId}
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedCandidateId(null); }}
          onCandidateUpdated={() => {
            fetchCRMData();
            fetchCandidatesDirectory(candidatesPage);
          }}
        />

        {/* POST ROLE MODAL */}
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Publish New Internship Opportunity</h3>
                </div>
                <button
                  onClick={() => setIsPostModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePostRole} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Distributed Systems Engineering Intern"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="San Francisco, CA / Remote"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Work Mode</label>
                    <select
                      value={newMode}
                      onChange={(e) => setNewMode(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Stipend / Comp</label>
                    <input
                      type="text"
                      value={newStipend}
                      onChange={(e) => setNewStipend(e.target.value)}
                      placeholder="$55/hr or $9,000/mo"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Required Skills (comma-separated)</label>
                    <input
                      type="text"
                      value={newSkills}
                      onChange={(e) => setNewSkills(e.target.value)}
                      placeholder="React, TypeScript, Go, Python"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role Description</label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Outline responsibilities, team impact, and mentorship structure..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPostModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
                  >
                    Publish Opportunity
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
