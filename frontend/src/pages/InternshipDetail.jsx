import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  MapPin,
  Clock,
  Calendar,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Share2,
  Building2,
  Send,
  X,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function InternshipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();

  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Application Modal & State
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [appliedInfo, setAppliedInfo] = useState(null);
  const [applySuccessMsg, setApplySuccessMsg] = useState('');

  // AI Interview Prep
  const [aiPrep, setAiPrep] = useState(null);
  const [aiPrepLoading, setAiPrepLoading] = useState(false);

  // Unauthenticated Prompt Modal
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/internships/${id}`);
        setInternship(res.data);
        setIsSaved(res.data.is_saved || false);

        // Check if student already applied to this role
        if (isAuthenticated && role === 'student') {
          try {
            const appsRes = await api.get('/applications/my');
            const found = appsRes.data.find((a) => a.internship_id === id);
            if (found) {
              setAlreadyApplied(true);
              setAppliedInfo(found);
            }
          } catch {
            // ignore
          }
        }

        // Fetch AI interview prep question
        fetchAiPrep(res.data);
      } catch (err) {
        console.error(err);
        setError('This internship opportunity could not be found or has been retired.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, isAuthenticated, role]);

  const fetchAiPrep = async (item) => {
    setAiPrepLoading(true);
    try {
      const qRes = await api.post('/ai/generate-questions', {
        company_name: item.company_name,
        role_title: item.title,
        skills: item.skills_required,
      });
      setAiPrep(qRes.data);
    } catch {
      setAiPrep({
        round_type: 'Technical Interview',
        question: `How would you architect a distributed solution for ${item.title} at ${item.company_name}?`,
      });
    } finally {
      setAiPrepLoading(false);
    }
  };

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    if (role !== 'student') return;

    try {
      const res = await api.post(`/internships/${id}/save`);
      setIsSaved(res.data.saved);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    if (role !== 'student') {
      alert('Only registered student candidates can submit internship applications.');
      return;
    }
    setApplyModalOpen(true);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
      const payload = {
        internship_id: id,
        cover_note: coverNote,
        resume_text: user?.profile?.resume_text || `${user?.full_name} student resume profile.`,
      };
      const res = await api.post('/applications', payload);
      setAlreadyApplied(true);
      setAppliedInfo(res.data);
      setApplySuccessMsg('Your application and verified profile were successfully submitted!');
      setApplyModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Application submission failed. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <AppLayout title="Internship Details" breadcrumbs={['Internships', 'Loading...']}>
        <div className="max-w-5xl mx-auto py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="text-sm text-slate-500 font-medium">Retrieving opportunity details from database...</div>
        </div>
      </AppLayout>
    );
  }

  if (error || !internship) {
    return (
      <AppLayout title="Opportunity Not Found" breadcrumbs={['Internships', 'Not Found']}>
        <div className="max-w-xl mx-auto py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Internship Not Available</h2>
          <p className="text-sm text-slate-500 mt-2">{error || 'This listing does not exist.'}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/explore"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
            >
              Browse Active Roles
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isClosed = internship.status === 'closed';

  return (
    <AppLayout title={internship.title} breadcrumbs={['Explore Internships', internship.title]}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Back Link */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to listings
          </button>

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied' : 'Share Opportunity'}
          </button>
        </div>

        {/* Success Alert Banner if just applied */}
        {applySuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{applySuccessMsg}</span>
            </div>
            <Link to="/student/applications" className="font-bold underline hover:text-emerald-900">
              Track in Applications &rarr;
            </Link>
          </div>
        )}

        {/* MAIN HEADER CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-indigo-700 text-xl shadow-xs shrink-0">
                {internship.company_initial || internship.company_name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    {internship.category || 'Engineering'}
                  </span>
                  {isClosed && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      Closed / Expired
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {internship.title}
                </h1>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-600 font-medium">
                  <span className="text-slate-900 font-semibold">{internship.company_name}</span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {internship.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Save Button for Desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={handleToggleSave}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  isSaved
                    ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                    : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
                }`}
                title={isSaved ? 'Saved to bookmarks' : 'Save for later'}
              >
                {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Key Attributes Bar */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Stipend / Comp</span>
              <span className="font-bold text-slate-900 text-sm">{internship.stipend}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Work Mode</span>
              <span className="font-bold text-slate-900 text-sm">{internship.work_mode}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Duration</span>
              <span className="font-bold text-slate-900 text-sm">{internship.duration}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Application Deadline</span>
              <span className="font-bold text-slate-900 text-sm">{internship.deadline}</span>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN DETAILS LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLS: DESCRIPTION & REQUIREMENTS */}
          <div className="lg:col-span-2 space-y-6">
            {/* About the Role */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                About the Internship
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {internship.description}
              </p>
            </div>

            {/* Required Skills & Tech Stack */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Required Skills & Tech Stack
              </h2>
              <div className="flex flex-wrap gap-2">
                {internship.skills_required?.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* AI Technical Preparation Hint */}
            <div className="bg-gradient-to-r from-indigo-50/60 to-teal-50/60 rounded-2xl border border-indigo-100 p-6 shadow-xs">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-2">
                <Sparkles className="w-4 h-4 text-teal-500" />
                AI Interview Preparation Question
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Generated based on {internship.company_name}&apos;s tech stack and engineering standards.
              </p>
              {aiPrepLoading ? (
                <div className="h-12 bg-white/70 rounded-xl animate-pulse" />
              ) : (
                <div className="bg-white p-4 rounded-xl border border-indigo-100/80 text-xs space-y-1.5">
                  <div className="font-semibold text-slate-900">
                    {aiPrep?.round_type || 'Technical Round'}:
                  </div>
                  <div className="text-slate-700 font-medium leading-relaxed italic">
                    &ldquo;{aiPrep?.question}&rdquo;
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 1 COL: STICKY APPLY CARD */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs sticky top-24">
              <h3 className="font-bold text-slate-900 text-base mb-1">Ready to Apply?</h3>
              <p className="text-xs text-slate-500 mb-5">
                Applications are reviewed directly by {internship.company_name}&apos;s hiring team.
              </p>

              {alreadyApplied ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <div className="font-bold text-emerald-900 text-sm">Application Submitted</div>
                  <div className="text-xs text-emerald-700 capitalize">
                    Current Status: <span className="font-bold">{appliedInfo?.status || 'In Review'}</span>
                  </div>
                  <Link
                    to="/student/applications"
                    className="inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline pt-1"
                  >
                    View in Application Center
                  </Link>
                </div>
              ) : isClosed ? (
                <div className="p-4 rounded-xl bg-slate-100 text-slate-600 text-center text-xs font-medium mb-4">
                  Applications for this opening are closed.
                </div>
              ) : (
                <button
                  onClick={handleApplyClick}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mb-3"
                >
                  <Send className="w-4 h-4" />
                  Apply Now
                </button>
              )}

              <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified Opportunity</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Deadline: {internship.deadline}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{internship.company_name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* APPLY MODAL */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fade-in relative">
            <button
              onClick={() => setApplyModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Apply to {internship.title}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Your verified profile, skills, and resume details will be submitted to {internship.company_name}.
            </p>

            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-semibold text-slate-800">Applying as: {user?.full_name}</div>
                <div className="text-slate-500">{user?.email} • {user?.profile?.university || 'Candidate'}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cover Note / Message to Recruiter (Optional)
                </label>
                <textarea
                  rows={4}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Introduce yourself and explain why you're a great fit for this position..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
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

            <h3 className="text-base font-bold text-slate-900 mb-1">Sign in to Apply</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Create an account or sign in to submit your verified student profile directly to {internship.company_name}.
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
    </AppLayout>
  );
}
