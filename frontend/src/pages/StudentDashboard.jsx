import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  GraduationCap,
  Sparkles,
  Send,
  Eye,
  Star,
  Video,
  Clock,
  ArrowRight,
  ExternalLink,
  Briefcase,
  Calendar,
  CheckCircle2,
  X,
  Target,
  FileText,
  Building2,
  MapPin,
  ChevronRight,
  Award,
} from 'lucide-react';

export default function StudentDashboard() {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    applied: 0,
    in_review: 0,
    shortlisted: 0,
    interviews: 0,
    conversion_rate: '0%',
  });
  const [internships, setInternships] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Portfolio modal
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState(user?.profile?.portfolio_url || '');
  const [readiness, setReadiness] = useState(user?.profile?.readiness_score || 0);

  useEffect(() => {
    if (user?.profile) {
      if (user.profile.portfolio_url) setPortfolioUrl(user.profile.portfolio_url);
      if (typeof user.profile.readiness_score === 'number') setReadiness(user.profile.readiness_score);
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, intRes, tasksRes] = await Promise.all([
          api.get('/applications/stats').catch(() => ({ data: stats })),
          api.get('/internships').catch(() => ({ data: [] })),
          api.get('/tasks').catch(() => ({ data: [] })),
        ]);
        if (statsRes.data) setStats(statsRes.data);
        if (intRes.data && intRes.data.length > 0) setInternships(intRes.data);
        if (tasksRes.data && tasksRes.data.length > 0) setTasks(tasksRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSavePortfolio = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/profile', {
        portfolio_url: portfolioUrl,
        readiness_score: 100,
      });
      setReadiness(100);
      updateUserProfile({ portfolio_url: portfolioUrl, readiness_score: 100 });
      setIsPortfolioModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyClick = (internship) => {
    navigate(`/internships/${internship.id}`);
  };

  return (
    <AppLayout activeTab="overview" title="Student Career Dashboard" breadcrumbs={['Overview']}>
      <div className="space-y-6 animate-fade-in">
        {/* WELCOME & READINESS HERO SECTION */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 shrink-0">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Welcome back, {user?.full_name || 'Student Candidate'}
                  </h2>
                  {user?.profile?.grad_year && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                      {user.profile.grad_year}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {user?.profile?.university || user?.profile?.degree
                    ? `${user?.profile?.university || ''}${user?.profile?.university && user?.profile?.degree ? ' • ' : ''}${user?.profile?.degree || ''}`
                    : (user?.email || 'Registered Candidate')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <button
                onClick={() => navigate('/explore')}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5" />
                Browse Internships
              </button>
              <button
                onClick={() => navigate('/student/profile')}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                My Profile
              </button>
            </div>
          </div>

          {/* Readiness Meter Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-medium mb-1.5">
              <span className="text-slate-700 flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                AI Career Readiness Score
              </span>
              <span className="text-indigo-600 font-bold">{readiness}% Complete</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${readiness}%` }}
              />
            </div>

            {readiness < 100 && (
              <div className="mt-3 flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-100 text-xs">
                <span className="text-slate-600">
                  Update your technical profile, skills, and portfolio to maximize recruiter discovery.
                </span>
                <button
                  onClick={() => navigate('/student/profile')}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer shrink-0 ml-3"
                >
                  Edit Profile <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4 SUMMARY METRIC KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/student/applications')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">{stats.applied}</div>
            <div className="mt-1 text-xs text-slate-500 font-medium flex items-center gap-1">
              <span>{stats.applied === 1 ? '1 active submission' : `${stats.applied} active submissions`}</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/student/applications')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Review</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">{stats.in_review}</div>
            <div className="mt-1 text-xs text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{stats.in_review > 0 ? 'Under employer review' : 'No pending reviews'}</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/student/applications')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shortlisted</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-teal-700 tracking-tight">{stats.shortlisted}</div>
            <div className="mt-1 text-xs text-teal-700 font-semibold flex items-center gap-1">
              <span>{stats.shortlisted > 0 ? 'Advanced to candidate shortlist' : 'None shortlisted yet'}</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/student/applications')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interviews</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-700 tracking-tight">{stats.interviews}</div>
            <div className="mt-1 text-xs text-indigo-600 font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{stats.upcoming_interview ? `Next: ${stats.upcoming_interview}` : (stats.interviews > 0 ? 'Interview scheduled' : 'No interviews scheduled')}</span>
            </div>
          </div>
        </div>

        {/* 2-COLUMN DASHBOARD GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Application Funnel & Recommended Roles */}
          <div className="lg:col-span-2 space-y-6">
            {/* Visual Funnel Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Application Conversion Pipeline</h3>
                  <p className="text-xs text-slate-500">Live progress across active internship submissions</p>
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  {stats.conversion_rate || '0%'} Conversion Rate
                </span>
              </div>

              {/* Progress Stepper Pipeline */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900 text-lg">{stats.applied}</div>
                  <div className="text-slate-500 text-[11px] font-medium mt-0.5">Applied</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900 text-lg">{stats.in_review}</div>
                  <div className="text-slate-500 text-[11px] font-medium mt-0.5">Under Review</div>
                </div>
                <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
                  <div className="font-bold text-teal-800 text-lg">{stats.shortlisted}</div>
                  <div className="text-teal-700 text-[11px] font-semibold mt-0.5">Shortlisted</div>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                  <div className="font-bold text-indigo-800 text-lg">{stats.interviews}</div>
                  <div className="text-indigo-700 text-[11px] font-semibold mt-0.5">Interviewing</div>
                </div>
              </div>
            </div>

            {/* Recommended Roles Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Featured & AI-Matched Opportunities</h3>
                  <p className="text-xs text-slate-500">Curated based on your verified skills & degree track</p>
                </div>
                <button
                  onClick={() => navigate('/student/explore')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  View All Roles <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {internships.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleApplyClick(item)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-indigo-600 text-sm">
                          {item.company_initial || item.company_name?.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                          <Sparkles className="w-3 h-3" />
                          {item.ai_match_percentage ? `${item.ai_match_percentage}% Match` : 'Verified Opening'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{item.company_name}</span>
                        <span>•</span>
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{item.work_mode || 'Remote'}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{item.stipend || 'Competitive'}</span>
                      <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Review Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Deadlines, Tasks & AI Assistant Quick Card */}
          <div className="space-y-6">
            {/* Upcoming Mentorship Tasks */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-sm font-bold text-slate-900">Active Mentorship Tasks</h3>
                <button
                  onClick={() => navigate('/student/tasks')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View Queue
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No pending tasks right now.</div>
              ) : (
                <div className="space-y-3">
                  {tasks.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigate('/student/tasks')}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">{t.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 uppercase ${
                            t.priority === 'high'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {t.priority || 'Normal'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span>Due: {t.deadline || 'Friday'}</span>
                        <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                          Submit PR <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Career Assistant Prompt Card */}
            <div className="bg-indigo-900 text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-800 text-teal-300 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Career Coach
                </div>
                <h4 className="text-base font-bold text-white leading-snug">Prepare for Technical Rounds</h4>
                <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                  Generate mock system design and coding interview questions tailored to Stripe, Meta, and Google.
                </p>
                <button
                  onClick={() => navigate('/student/ai-coach')}
                  className="mt-4 px-3.5 py-2 rounded-lg bg-teal-500 text-slate-900 text-xs font-bold hover:bg-teal-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  Launch AI Studio <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PORTFOLIO & PROFILE MODAL */}
        {isPortfolioModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-slide-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Update Profile & Portfolio</h3>
                </div>
                <button
                  onClick={() => setIsPortfolioModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePortfolio} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Portfolio or GitHub URL</label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.dev or https://github.com/yourhandle"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Adds verified portfolio links to recruiter review cards.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPortfolioModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Save & Boost Score
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
