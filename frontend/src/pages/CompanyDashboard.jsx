import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
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
} from 'lucide-react';

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const [activeTab, setActiveTab] = useState(() => (viewParam === 'postings' ? 'postings' : 'applicants'));

  useEffect(() => {
    if (viewParam === 'postings' || viewParam === 'applicants') {
      setActiveTab(viewParam);
    }
  }, [viewParam]);
  const [stats, setStats] = useState({
    active_postings: 0,
    total_applicants: 0,
    shortlisted: 0,
    interviews: 0,
  });
  const [candidates, setCandidates] = useState([]);
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Post Role Modal
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('Remote');
  const [newMode, setNewMode] = useState('Remote');
  const [newStipend, setNewStipend] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Interview Modal
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');

  // Decision Modal (Shortlist / Decline with Recruiter Feedback)
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionCandidate, setDecisionCandidate] = useState(null);
  const [decisionStatus, setDecisionStatus] = useState('');
  const [decisionFeedback, setDecisionFeedback] = useState('');

  const [actionNotice, setActionNotice] = useState('');

  const fetchData = async () => {
    try {
      const [statsRes, candRes, postRes] = await Promise.all([
        api.get('/applications/stats').catch(() => ({ data: stats })),
        api.get('/applications/company').catch(() => ({ data: [] })),
        api.get('/internships/my/postings').catch(() => api.get('/internships').catch(() => ({ data: [] }))),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (candRes.data && Array.isArray(candRes.data)) setCandidates(candRes.data);
      if (postRes.data) setPostings(postRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (id, status, extra = {}) => {
    try {
      await api.patch(`/applications/${id}/status`, {
        status,
        ...extra,
      });
      setActionNotice(`Candidate status updated to ${status.toUpperCase()}!`);
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, ...extra } : c))
      );
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Failed to update candidate status.';
      setActionNotice(`Error: ${errMsg}`);
      setTimeout(() => setActionNotice(''), 5000);
    }
  };

  const handleOpenInterview = (candidate) => {
    setSelectedCandidate(candidate);
    setIsInterviewModalOpen(true);
  };

  const handleConfirmInterview = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    await handleStatusUpdate(selectedCandidate.id, 'interview', {
      interview_date: interviewDate,
      interview_notes: interviewNotes,
      feedback: interviewNotes,
      current_status: selectedCandidate.status,
    });
    setIsInterviewModalOpen(false);
  };

  const handleOpenDecision = (candidate, status) => {
    setDecisionCandidate(candidate);
    setDecisionStatus(status);
    setDecisionFeedback(
      status === 'shortlisted'
        ? 'Candidate profile and technical experience match our core engineering requirements.'
        : 'Thank you for your interest. We are proceeding with candidates whose technical stack aligns more closely with this cycle.'
    );
    setIsDecisionModalOpen(true);
  };

  const handleConfirmDecision = async (e) => {
    e.preventDefault();
    if (!decisionCandidate) return;
    await handleStatusUpdate(decisionCandidate.id, decisionStatus, {
      feedback: decisionFeedback,
      current_status: decisionCandidate.status,
    });
    setIsDecisionModalOpen(false);
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
      setActionNotice('🎉 New internship role published successfully!');
      setIsPostModalOpen(false);
      setNewTitle('');
      fetchData();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClosePosting = async (id) => {
    try {
      await api.delete(`/internships/${id}`);
      setActionNotice('Internship posting closed.');
      fetchData();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout activeTab="overview" title="Recruiter Hub & Talent CRM" breadcrumbs={['Recruiter Hub']}>
      <div className="space-y-6 animate-fade-in">
        {/* Company Header Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 font-bold text-base">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{user?.full_name || (user?.email ? user.email.split('@')[0].toUpperCase() : 'Registered Employer')}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  Verified Employer
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {postings.length} Active Postings • Enterprise Recruitment Hub
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPostModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Post New Opportunity
          </button>
        </div>

        {/* Global Action Alert */}
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

        {/* 4 RECRUITER METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Roles</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">{postings.length}</div>
            <div className="mt-1 text-xs text-blue-600 font-medium">Published & receiving applicants</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Pool</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">{candidates.length}</div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              {candidates.length} total applicant{candidates.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shortlisted</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-teal-700 tracking-tight">{stats.shortlisted}</div>
            <div className="mt-1 text-xs text-teal-700 font-semibold">{stats.shortlisted} advanced to shortlist</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interviews</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-700 tracking-tight">{stats.interviews}</div>
            <div className="mt-1 text-xs text-purple-600 font-medium">{stats.interviews} scheduled rounds</div>
          </div>
        </div>

        {/* VIEW SELECTOR TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('applicants')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'applicants'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Review Candidate Stream ({candidates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('postings')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'postings'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Manage Job Postings ({postings.length})</span>
          </button>
        </div>

        {/* TAB 1: REVIEW APPLICANTS */}
        {activeTab === 'applicants' && (
          <div className="space-y-4">
            {candidates.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900">No applicants in queue</h3>
                <p className="text-xs text-slate-500 mt-1">Applications submitted by students will appear in this review stream.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {candidates.map((cand) => (
                  <article
                    key={cand.id}
                    className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-indigo-700 text-sm overflow-hidden shrink-0">
                          {cand.student_avatar ? (
                            <img src={cand.student_avatar} alt={cand.student_name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{cand.student_name?.slice(0, 2).toUpperCase() || 'ST'}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900">{cand.student_name}</h3>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                              <Sparkles className="w-3 h-3 text-teal-600" />
                              {cand.ai_match_percentage ? `${cand.ai_match_percentage}% AI Fit` : 'Verified Candidate'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cand.student_university || cand.student_email || 'Candidate'} • Applied {cand.applied_at || 'Recently'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize shrink-0 self-start sm:self-auto ${
                          cand.status === 'interview'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : cand.status === 'shortlisted'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : cand.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {cand.status?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Candidate Skills Stack */}
                    <div className="flex flex-wrap gap-1.5">
                      {cand.skills && cand.skills.length > 0 ? (
                        cand.skills.map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium"
                          >
                            {sk}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No skills highlighted on application</span>
                      )}
                    </div>

                    {/* AI Insight Snippet */}
                    {cand.ai_insight && (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2 text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <p className="text-slate-600 leading-relaxed">{cand.ai_insight}</p>
                      </div>
                    )}

                    {/* Scheduled Interview Ribbon */}
                    {cand.interview_date && (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <span>{cand.interview_date}</span>
                        </div>
                        <span className="text-indigo-700 font-medium">{cand.interview_notes}</span>
                      </div>
                    )}

                    {/* Candidate Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleOpenDecision(cand, 'rejected')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDecision(cand, 'shortlisted')}
                        className="px-3.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold hover:bg-teal-100 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5 text-teal-600" />
                        Shortlist Candidate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenInterview(cand)}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Schedule Interview
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANAGE JOB POSTINGS */}
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

        {/* POST ROLE MODAL */}
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Publish New Internship Opportunity</h3>
                </div>
                <button
                  onClick={() => setIsPostModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600"
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
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                  >
                    Publish Opportunity
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INTERVIEW MODAL */}
        {isInterviewModalOpen && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Schedule Interview</h3>
                </div>
                <button
                  onClick={() => setIsInterviewModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmInterview} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedCandidate.student_name} (${selectedCandidate.student_university || 'Student'})`}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time</label>
                  <input
                    type="text"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    placeholder="e.g. Tomorrow, 2:00 PM PST"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Round Agenda / Notes</label>
                  <input
                    type="text"
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    placeholder="e.g. Technical Architecture & System Design Round"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsInterviewModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Confirm Interview
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DECISION MODAL (SHORTLIST / DECLINE WITH OPTIONAL FEEDBACK) */}
        {isDecisionModalOpen && decisionCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    decisionStatus === 'shortlisted' ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {decisionStatus === 'shortlisted' ? <Star className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {decisionStatus === 'shortlisted' ? 'Shortlist Candidate' : 'Decline Candidate'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmDecision} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate</label>
                  <input
                    type="text"
                    disabled
                    value={`${decisionCandidate.student_name} (${decisionCandidate.student_university || 'Student'})`}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recruiter Feedback / Notes for Timeline
                  </label>
                  <textarea
                    rows={3}
                    value={decisionFeedback}
                    onChange={(e) => setDecisionFeedback(e.target.value)}
                    placeholder="Add constructive notes or feedback that will appear in the candidate's tracking timeline..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsDecisionModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs ${
                      decisionStatus === 'shortlisted'
                        ? 'bg-teal-600 hover:bg-teal-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    Confirm {decisionStatus === 'shortlisted' ? 'Shortlist' : 'Decline'}
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
