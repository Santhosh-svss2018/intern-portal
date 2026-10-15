import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams, useNavigate, Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Briefcase,
  MapPin,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  X,
  ChevronRight,
  Send,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

export default function StudentExplore() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, role } = useAuth();

  const [internships, setInternships] = useState([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedFilter, setSelectedFilter] = useState(searchParams.get('category') || 'All');
  const [loading, setLoading] = useState(true);

  // Preview Drawer Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [aiQuestion, setAiQuestion] = useState(null);
  const [aiQuestionLoading, setAiQuestionLoading] = useState(false);

  // Apply Feedback Alert
  const [applyMessage, setApplyMessage] = useState('');
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  const filterChips = [
    { label: 'All Opportunities', value: 'All' },
    { label: 'Remote Only', value: 'Remote' },
    { label: '$40+/hr', value: '40' },
    { label: 'AI & Machine Learning', value: 'AI & ML', isAi: true },
    { label: 'Software Engineering', value: 'Software Eng' },
    { label: 'Summer 2025', value: 'Summer 2025' },
  ];

  const fetchInternships = async () => {
    try {
      let url = '/internships';
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedFilter === 'Remote') params.work_mode = 'Remote';
      if (selectedFilter === '40') params.min_stipend = 40;
      if (selectedFilter === 'AI & ML') params.category = 'AI & ML';
      if (selectedFilter === 'Software Eng') params.category = 'Software Eng';

      const res = await api.get(url, { params });
      setInternships(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInternships();
  }, [searchTerm, selectedFilter]);

  const handleOpenPreview = async (item) => {
    setSelectedRole(item);
    setPreviewModalOpen(true);
    setAiQuestionLoading(true);

    try {
      const qRes = await api.post('/ai/generate-questions', {
        company_name: item.company_name,
        role_title: item.title,
        skills: item.skills_required,
      });
      setAiQuestion(qRes.data);
    } catch {
      setAiQuestion({
        round_type: 'Technical Round',
        question: `How would you architect a high-scale idempotent solution for ${item.title} at ${item.company_name}?`,
      });
    } finally {
      setAiQuestionLoading(false);
    }
  };

  // Open passed internship if navigated from dashboard
  useEffect(() => {
    if (location.state?.selectedInternship) {
      handleOpenPreview(location.state.selectedInternship);
    }
  }, [location.state]);

  const handleToggleSave = async (id, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    try {
      const res = await api.post(`/internships/${id}/save`);
      setInternships((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_saved: res.data.saved } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleApply = async (internshipId, roleTitle, companyName) => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    if (role !== 'student') {
      alert('Only registered student candidates can submit applications.');
      return;
    }
    try {
      await api.post('/applications', {
        internship_id: internshipId,
      });
      setApplyMessage({
        type: 'success',
        text: `🎉 Successfully applied for ${roleTitle} at ${companyName}! Track its progress in your dashboard.`,
      });
      setPreviewModalOpen(false);
      setTimeout(() => setApplyMessage(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit application. Please verify your profile and try again.';
      setApplyMessage({
        type: 'error',
        text: msg,
      });
      setTimeout(() => setApplyMessage(null), 5000);
    }
  };

  return (
    <AppLayout activeTab="matches" title="Explore Internships" breadcrumbs={['Discover']}>
      <div className="space-y-6 animate-fade-in">
        {/* Global Toast Alert */}
        {applyMessage && (
          <div
            className={`p-3.5 border rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-slide-up ${
              applyMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {applyMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{applyMessage.text}</span>
            </div>
            <button
              onClick={() => setApplyMessage(null)}
              className={`p-1 cursor-pointer ${
                applyMessage.type === 'success'
                  ? 'text-emerald-600 hover:text-emerald-800'
                  : 'text-rose-600 hover:text-rose-800'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* AI SMART MATCH BANNER */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">AI Skills Matching Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 uppercase">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Roles are dynamically ranked against your verified profile competencies and coursework.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{internships.length} Verified Roles Live</span>
          </div>
        </div>

        {/* SEARCH AND FILTER BAR */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search opportunities by title, company, or skills (e.g., React, Python, Distributed Systems)..."
              className="w-full h-10 pl-10 pr-9 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            {filterChips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => setSelectedFilter(chip.value)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedFilter === chip.value
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {chip.isAi && <Sparkles className="w-3 h-3 text-teal-400" />}
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* INTERNSHIPS GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-4">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-8 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : internships.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">No internship roles found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query or reset the filter tags to discover other active opportunities.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedFilter('All');
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {internships.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenPreview(item)}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-indigo-700 text-sm shrink-0">
                      {item.company_initial || item.company_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                        <Sparkles className="w-3 h-3 text-teal-600" />
                        {item.ai_match_percentage || 95}% Match
                      </span>
                      <button
                        onClick={(e) => handleToggleSave(item.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title={item.is_saved ? 'Saved' : 'Save opportunity'}
                      >
                        {item.is_saved ? (
                          <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <span className="font-medium text-slate-700">{item.company_name}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {item.work_mode || 'Remote'}
                    </span>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3.5">
                    {(item.skills_required || ['React', 'TypeScript', 'Node.js']).slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {(item.skills_required || []).length > 3 && (
                      <span className="px-1.5 py-0.5 text-slate-400 text-[10px] font-medium">
                        +{item.skills_required.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-medium">Stipend</span>
                    <span className="font-bold text-slate-900">{item.stipend || '$45/hr'}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPreview(item);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ROLE DETAILS & AI INTERVIEW MODAL */}
        {previewModalOpen && selectedRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 shadow-2xl border border-slate-200 animate-slide-up space-y-5">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-base shrink-0">
                    {selectedRole.company_initial || selectedRole.company_name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{selectedRole.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedRole.company_name} • {selectedRole.location || 'San Francisco, CA'} ({selectedRole.work_mode})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Metadata Grid */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Stipend</span>
                  <span className="font-bold text-slate-900">{selectedRole.stipend || '$50/hr'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Duration</span>
                  <span className="font-bold text-slate-900">{selectedRole.duration || '12 Weeks'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">AI Match</span>
                  <span className="font-bold text-teal-700">{selectedRole.ai_match_percentage || 95}% Fit</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">Role Overview</h4>
                <p className="text-xs leading-relaxed text-slate-600">
                  {selectedRole.description ||
                    'Join our high-impact engineering team to build scalable full-stack features, contribute to core production microservices, and collaborate closely with senior engineering mentors.'}
                </p>
              </div>

              {/* Skills Required */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedRole.skills_required || ['React', 'TypeScript', 'Node.js', 'FastAPI']).map((s, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Interview Prep Studio Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold text-teal-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Interview Practice Question
                  </span>
                  <span>{aiQuestion?.round_type || 'Technical Phone Screen'}</span>
                </div>
                {aiQuestionLoading ? (
                  <p className="text-xs text-slate-400 animate-pulse">Generating interview questions tailored to {selectedRole.company_name}...</p>
                ) : (
                  <p className="text-xs text-slate-200 leading-relaxed italic">
                    "{aiQuestion?.question || `How would you architect high-throughput services for ${selectedRole.company_name}?`}"
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSave(selectedRole.id, { stopPropagation: () => {} })}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {selectedRole.is_saved ? 'Saved' : 'Save for Later'}
                  </button>
                  <Link
                    to={`/internships/${selectedRole.id}`}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Dedicated Page
                  </Link>
                </div>
                <button
                  onClick={() => handleApply(selectedRole.id, selectedRole.title, selectedRole.company_name)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Apply with Verified Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AUTHENTICATION PROMPT DIALOG */}
        {authPromptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-fade-in relative">
              <button
                onClick={() => setAuthPromptOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">Sign in to Continue</h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Sign in with a student account to save opportunities and submit one-click verified applications.
              </p>

              <div className="space-y-2">
                <Link
                  to="/login"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors block text-center"
                >
                  Sign In with Student Account
                </Link>
                <Link
                  to="/login?mode=signup"
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors block text-center"
                >
                  Create New Account
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
