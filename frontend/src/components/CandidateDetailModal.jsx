import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  X,
  Sparkles,
  User,
  GraduationCap,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  CheckSquare,
  Video,
  Star,
  ExternalLink,
  Plus,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Send,
  Copy,
  Check,
  TrendingUp,
  Brain,
  HelpCircle,
} from 'lucide-react';

const STAGE_CONFIG = {
  applied: { label: 'Applied', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  screening: { label: 'Screening', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  shortlisted: { label: 'Shortlisted', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  interview: { label: 'Interview', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  offer: { label: 'Offer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  hired: { label: 'Hired', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  rejected: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function CandidateDetailModal({ candidateId, isOpen, onClose, onCandidateUpdated }) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, notes, tasks, interview, timeline, ai
  const [actionNotice, setActionNotice] = useState('');

  // Note form
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [submittingTask, setSubmittingTask] = useState(false);

  // Interview outcome form
  const [roundType, setRoundType] = useState('Technical Round');
  const [rating, setRating] = useState(4);
  const [recommendation, setRecommendation] = useState('hire');
  const [strengths, setStrengths] = useState('');
  const [concerns, setConcerns] = useState('');
  const [interviewNotesText, setInterviewNotesText] = useState('');
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  // Interview schedule quick form
  const [quickDate, setQuickDate] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // AI Assistant states
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiQuestions, setAiQuestions] = useState(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsRound, setQuestionsRound] = useState('Technical Round');
  const [copiedResume, setCopiedResume] = useState(false);

  const fetchCandidate = async () => {
    if (!candidateId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/crm/candidates/${candidateId}`);
      setCandidate(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load candidate profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && candidateId) {
      fetchCandidate();
      setActiveTab('overview');
      setAiSummary(null);
      setAiQuestions(null);
    }
  }, [isOpen, candidateId]);

  const showToast = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 4500);
  };

  const handleStageChange = async (targetStage) => {
    if (!candidate) return;
    try {
      await api.patch(`/crm/candidates/${candidate.id}/stage`, {
        stage: targetStage,
        feedback: `Recruiter moved candidate to ${targetStage.toUpperCase()} stage`,
        current_stage: candidate.stage,
      });
      showToast(`Candidate stage updated to ${targetStage.toUpperCase()}!`);
      fetchCandidate();
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      showToast(`Error: ${err.response?.data?.detail || 'Failed to update stage'}`);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await api.post(`/crm/candidates/${candidate.id}/notes`, { content: newNote.trim() });
      setNewNote('');
      showToast('Recruiter note saved.');
      fetchCandidate();
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      showToast(`Error: ${err.response?.data?.detail || 'Failed to save note'}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/crm/candidates/${candidate.id}/notes/${noteId}`);
      showToast('Note deleted.');
      fetchCandidate();
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      showToast(`Error: ${err.response?.data?.detail || 'Failed to delete note'}`);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setSubmittingTask(true);
    try {
      await api.post(`/crm/candidates/${candidate.id}/tasks`, {
        title: taskTitle.trim(),
        due_date: taskDueDate || null,
        priority: taskPriority,
      });
      setTaskTitle('');
      setTaskDueDate('');
      showToast('Follow-up task scheduled.');
      fetchCandidate();
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      showToast(`Error: ${err.response?.data?.detail || 'Failed to add task'}`);
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleToggleTask = async (taskId, currentCompleted) => {
    try {
      await api.patch(`/crm/candidates/${candidate.id}/tasks/${taskId}`, {
        completed: !currentCompleted,
      });
      showToast(!currentCompleted ? 'Task marked complete.' : 'Task reopened.');
      fetchCandidate();
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      showToast('Failed to update task.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/crm/candidates/${candidate.id}/tasks/${taskId}`);
      showToast('Task removed.');
      fetchCandidate();
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      showToast('Failed to remove task.');
    }
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    if (!quickDate.trim()) return;
    setIsScheduling(true);
    try {
      await api.patch(`/crm/candidates/${candidate.id}/stage`, {
        stage: 'interview',
        feedback: `Interview scheduled for ${quickDate}. Agenda: ${quickNotes || 'Technical Evaluation'}`,
      });
      // also record the date directly
      await api.patch(`/applications/${candidate.id}/status`, {
        status: 'interview',
        interview_date: quickDate,
        interview_notes: quickNotes,
      });
      showToast('Interview confirmed & candidate transitioned to Interview stage!');
      setQuickDate('');
      setQuickNotes('');
      fetchCandidate();
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      showToast(`Error: ${err.response?.data?.detail || 'Failed to schedule interview'}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleRecordOutcome = async (e) => {
    e.preventDefault();
    setSubmittingOutcome(true);
    try {
      await api.post(`/crm/candidates/${candidate.id}/interviews`, {
        round_type: roundType,
        rating: Number(rating),
        recommendation,
        strengths: strengths.trim() || undefined,
        concerns: concerns.trim() || undefined,
        notes: interviewNotesText.trim() || undefined,
      });
      setStrengths('');
      setConcerns('');
      setInterviewNotesText('');
      showToast('Interview outcome and score logged.');
      fetchCandidate();
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      showToast(`Error: ${err.response?.data?.detail || 'Failed to record outcome'}`);
    } finally {
      setSubmittingOutcome(false);
    }
  };

  const handleGenerateAISummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await api.post(`/crm/candidates/${candidate.id}/ai-summary`);
      setAiSummary(res.data);
    } catch (err) {
      showToast(`AI Summary error: ${err.response?.data?.detail || 'Unavailable'}`);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateAIQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await api.post(
        `/crm/candidates/${candidate.id}/ai-interview-questions?round_type=${encodeURIComponent(questionsRound)}`
      );
      setAiQuestions(res.data);
    } catch (err) {
      showToast(`AI Questions error: ${err.response?.data?.detail || 'Unavailable'}`);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleCopyResume = () => {
    if (candidate?.resume_text) {
      navigator.clipboard.writeText(candidate.resume_text);
      setCopiedResume(true);
      setTimeout(() => setCopiedResume(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 overflow-hidden">
              {candidate?.student_avatar ? (
                <img src={candidate.student_avatar} alt={candidate.student_name} className="w-full h-full object-cover" />
              ) : (
                <span>{candidate?.student_name?.slice(0, 2).toUpperCase() || 'ST'}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{candidate?.student_name || 'Loading candidate...'}</h3>
                {candidate?.ai_match_percentage && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    {candidate.ai_match_percentage}% AI Fit
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {candidate?.student_university || 'Candidate'} • Applied for <strong className="text-slate-700 font-semibold">{candidate?.internship_title}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Stage Quick Switcher */}
            {candidate && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">Stage:</span>
                <select
                  value={candidate.stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer shadow-2xs"
                >
                  <option value="applied">Applied</option>
                  <option value="screening">Screening</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ACTION FEEDBACK ALERT */}
        {actionNotice && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border-b border-emerald-200 text-xs font-semibold flex items-center justify-between px-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice('')} className="p-1 text-emerald-600 hover:text-emerald-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-200 bg-white overflow-x-auto custom-scrollbar shrink-0">
          {[
            { id: 'overview', label: 'Candidate Overview', icon: User },
            { id: 'notes', label: `Recruiter Notes (${candidate?.recruiter_notes?.length || 0})`, icon: MessageSquare },
            { id: 'tasks', label: `Follow-up Tasks (${candidate?.follow_up_tasks?.filter((t) => !t.completed).length || 0})`, icon: CheckSquare },
            { id: 'interview', label: 'Interview & Feedback', icon: Video },
            { id: 'timeline', label: 'Activity Timeline', icon: Clock },
            { id: 'ai', label: 'Gemini AI Copilot', icon: Sparkles, highlight: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/30'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                } ${tab.highlight && !isActive ? 'text-teal-700 font-bold' : ''}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : tab.highlight ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 animate-pulse space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
              <p>Loading candidate profile details...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-700 bg-rose-50 rounded-xl border border-rose-200 text-xs">
              <AlertCircle className="w-6 h-6 text-rose-600 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : candidate ? (
            <>
              {/* TAB 1: CANDIDATE OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5 animate-fade-in">
                  {/* AI Match Insight Banner */}
                  {candidate.ai_insight && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-50/70 to-indigo-50/70 border border-teal-200/80 flex items-start gap-3 text-xs">
                      <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-teal-950">AI Competency & Skill Alignment</span>
                        <p className="text-slate-700 mt-0.5 leading-relaxed">{candidate.ai_insight}</p>
                      </div>
                    </div>
                  )}

                  {/* Candidate Quick Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">University & Degree</span>
                      <p className="font-bold text-slate-900 mt-1">{candidate.student_university || 'University'}</p>
                      <p className="text-slate-500 text-[11px]">{candidate.student_degree || 'Computer Science'}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contact & Links</span>
                      <p className="font-semibold text-slate-800 mt-1 truncate">{candidate.student_email || 'Not provided'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {candidate.github_url && (
                          <a href={candidate.github_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5 text-[11px]">
                            GitHub <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {candidate.linkedin_url && (
                          <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5 text-[11px]">
                            LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {candidate.portfolio_url && (
                          <a href={candidate.portfolio_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5 text-[11px]">
                            Portfolio <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current Pipeline Stage</span>
                      <div className="mt-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-block uppercase ${STAGE_CONFIG[candidate.stage]?.color || 'bg-slate-100 text-slate-700'}`}>
                          {STAGE_CONFIG[candidate.stage]?.label || candidate.stage}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Applied: {candidate.applied_at || 'Recently'}</p>
                    </div>
                  </div>

                  {/* Skills Grid */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">Verified Candidate Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills && candidate.skills.length > 0 ? (
                        candidate.skills.map((s) => (
                          <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No skills specified on candidate submission.</span>
                      )}
                    </div>
                  </div>

                  {/* Resume Snippet Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Resume Text & Highlights</h4>
                      {candidate.resume_text && (
                        <button
                          onClick={handleCopyResume}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedResume ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedResume ? 'Copied' : 'Copy Text'}</span>
                        </button>
                      )}
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                      {candidate.resume_text || 'Candidate did not attach raw resume text to this submission. Skills extracted from verified student profile.'}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RECRUITER NOTES */}
              {activeTab === 'notes' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Confidential Recruiter Thread — Private to your company. Never exposed to candidates.</span>
                    </div>
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      rows={3}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add recruiter thoughts, phone screen observations, candidate salary expectations..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none shadow-2xs"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingNote || !newNote.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Save Private Note</span>
                      </button>
                    </div>
                  </form>

                  {/* Notes Feed */}
                  <div className="space-y-2.5 pt-2">
                    {candidate.recruiter_notes?.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                        <MessageSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                        <p>No recruiter notes recorded for this candidate yet.</p>
                      </div>
                    ) : (
                      candidate.recruiter_notes?.map((n) => (
                        <div key={n.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{n.author_name} ({n.author_role})</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-mono">
                                {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <button
                                onClick={() => handleDeleteNote(n.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: FOLLOW-UP TASKS */}
              {activeTab === 'tasks' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Add Task Form */}
                  <form onSubmit={handleAddTask} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Schedule Follow-up Action</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="e.g. Send offer letter or verify graduation date..."
                          required
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={taskDueDate}
                          onChange={(e) => setTaskDueDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">Priority:</span>
                        {['high', 'medium', 'low'].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTaskPriority(p)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase cursor-pointer border ${
                              taskPriority === p
                                ? p === 'high'
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : p === 'medium'
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-slate-600 text-white border-slate-600'
                                : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={submittingTask || !taskTitle.trim()}
                        className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </form>

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {candidate.follow_up_tasks?.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                        <CheckSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                        <p>No follow-up tasks currently assigned for this candidate.</p>
                      </div>
                    ) : (
                      candidate.follow_up_tasks?.map((t) => (
                        <div
                          key={t.id}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                            t.completed ? 'bg-slate-50/60 border-slate-200 text-slate-400' : 'bg-white border-slate-200 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={t.completed}
                              onChange={() => handleToggleTask(t.id, t.completed)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <p className={`font-semibold ${t.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {t.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                                {t.due_date && (
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <Calendar className="w-3 h-3" /> Due {t.due_date}
                                  </span>
                                )}
                                <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[10px] ${
                                  t.priority === 'high' ? 'bg-rose-50 text-rose-700' : t.priority === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {t.priority}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Remove task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: INTERVIEW & OUTCOMES */}
              {activeTab === 'interview' && (
                <div className="space-y-5 animate-fade-in">
                  {/* Quick Interview Schedule */}
                  <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                      <Video className="w-4 h-4 text-indigo-600" />
                      <span>Schedule Next Interview Round</span>
                    </h4>
                    <form onSubmit={handleScheduleInterview} className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={quickDate}
                          onChange={(e) => setQuickDate(e.target.value)}
                          placeholder="e.g. Thursday, 2:00 PM PST"
                          required
                          className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                        <input
                          type="text"
                          value={quickNotes}
                          onChange={(e) => setQuickNotes(e.target.value)}
                          placeholder="Round: System Design & Live Coding"
                          className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isScheduling || !quickDate.trim()}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                        >
                          Confirm & Notify Student
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Record Interview Feedback Form */}
                  <form onSubmit={handleRecordOutcome} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Record Structured Interview Feedback & Score
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Round Type</label>
                        <select
                          value={roundType}
                          onChange={(e) => setRoundType(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="Resume Screen">Resume Screen</option>
                          <option value="Technical Round">Technical Round</option>
                          <option value="System Design Round">System Design Round</option>
                          <option value="Behavioral Round">Behavioral Round</option>
                          <option value="Final Executive Round">Final Executive Round</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Score (1 to 5 Stars)</label>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <button
                              key={starVal}
                              type="button"
                              onClick={() => setRating(starVal)}
                              className="cursor-pointer focus:outline-none"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  starVal <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-bold text-slate-700 ml-1.5">{rating}/5</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hiring Recommendation</label>
                        <select
                          value={recommendation}
                          onChange={(e) => setRecommendation(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="strong_hire">Strong Hire</option>
                          <option value="hire">Hire</option>
                          <option value="hold">Hold / Re-evaluate</option>
                          <option value="no_hire">No Hire</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Key Strengths Demonstrated</label>
                        <input
                          type="text"
                          value={strengths}
                          onChange={(e) => setStrengths(e.target.value)}
                          placeholder="e.g. Strong asymptotic analysis, clean modular code"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Areas of Concern</label>
                        <input
                          type="text"
                          value={concerns}
                          onChange={(e) => setConcerns(e.target.value)}
                          placeholder="e.g. Hesitant on edge case testing"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Detailed Evaluation Notes</label>
                      <textarea
                        rows={2}
                        value={interviewNotesText}
                        onChange={(e) => setInterviewNotesText(e.target.value)}
                        placeholder="Synthesis of problem solving approach, communication, depth of experience..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingOutcome}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                      >
                        Log Interview Feedback
                      </button>
                    </div>
                  </form>

                  {/* Previous Interview Feedback Cards */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Evaluation History</h4>
                    {candidate.interview_feedback?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No interview outcomes logged yet.</p>
                    ) : (
                      candidate.interview_feedback?.map((i) => (
                        <div key={i.id} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{i.round_type}</span>
                              <div className="flex items-center text-amber-500">
                                {[...Array(i.rating)].map((_, idx) => (
                                  <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                ))}
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              i.recommendation === 'strong_hire' || i.recommendation === 'hire'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {i.recommendation?.replace('_', ' ')}
                            </span>
                          </div>
                          {i.notes && <p className="text-slate-600">{i.notes}</p>}
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>Interviewer: {i.interviewer_name}</span>
                            <span>•</span>
                            <span>{new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: ACTIVITY TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Audit & Interaction History</h4>
                  <div className="relative pl-5 border-l-2 border-indigo-100 space-y-4 my-2 text-xs">
                    {candidate.activity_timeline?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No recorded activity history.</p>
                    ) : (
                      candidate.activity_timeline?.map((ev, idx) => (
                        <div key={ev.id || idx} className="relative group">
                          <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-indigo-600 ring-4 ring-indigo-50 border-2 border-white" />
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{ev.title}</span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {ev.timestamp ? new Date(ev.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                              </span>
                            </div>
                            {ev.details && <p className="text-slate-600 mt-1 leading-relaxed">{ev.details}</p>}
                            <div className="mt-1 text-[11px] text-slate-400">
                              By {ev.actor_name} ({ev.actor_role})
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: GEMINI AI COPILOT */}
              {activeTab === 'ai' && (
                <div className="space-y-5 animate-fade-in">
                  {/* AI Disclaimer Alert */}
                  <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl flex items-start gap-2.5 text-xs text-purple-900">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Gemini AI Recruiter Copilot</span>
                      <p className="text-purple-800 mt-0.5">
                        AI assistance is strictly advisory for faster candidate assessment. Automated hiring/rejection decisions are disabled.
                      </p>
                    </div>
                  </div>

                  {/* AI Feature 1: Candidate Briefing */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-indigo-600" />
                          <span>Candidate Qualification Synthesis</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Summarizes candidate background and points out key technical areas to verify in interview.
                        </p>
                      </div>

                      <button
                        onClick={handleGenerateAISummary}
                        disabled={loadingSummary}
                        className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{loadingSummary ? 'Analyzing...' : 'Generate AI Summary'}</span>
                      </button>
                    </div>

                    {aiSummary && (
                      <div className="p-4 bg-white border border-indigo-100 rounded-xl text-xs space-y-3 animate-fade-in shadow-2xs">
                        <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{aiSummary.summary}</div>

                        {aiSummary.key_strengths?.length > 0 && (
                          <div>
                            <span className="font-bold text-slate-900">Key Strengths Highlighted:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {aiSummary.key_strengths.map((str, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                                  ✓ {str}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {aiSummary.suggested_verification_areas?.length > 0 && (
                          <div>
                            <span className="font-bold text-slate-900">Areas to Probe in Live Interview:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {aiSummary.suggested_verification_areas.map((gap, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                                  ? {gap}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                          {aiSummary.disclaimer} • Provider: {aiSummary.provider}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Feature 2: Interview Questions Generator */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-purple-600" />
                          <span>Generate Tailored Interview Questions</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Custom role-specific technical questions and follow-up probes for the interviewer.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={questionsRound}
                          onChange={(e) => setQuestionsRound(e.target.value)}
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="Technical Round">Technical Round</option>
                          <option value="System Design">System Design</option>
                          <option value="Behavioral">Behavioral</option>
                        </select>

                        <button
                          onClick={handleGenerateAIQuestions}
                          disabled={loadingQuestions}
                          className="px-3.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{loadingQuestions ? 'Generating...' : 'Generate Questions'}</span>
                        </button>
                      </div>
                    </div>

                    {aiQuestions && (
                      <div className="space-y-3 pt-1 animate-fade-in">
                        {aiQuestions.questions?.map((q, idx) => (
                          <div key={idx} className="p-3.5 bg-white border border-purple-100 rounded-xl text-xs space-y-2 shadow-2xs">
                            <div className="font-bold text-slate-900">
                              Q{idx + 1}: {q.question}
                            </div>
                            {q.intent && (
                              <p className="text-[11px] text-purple-700 bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                                <strong>Assessment Intent:</strong> {q.intent}
                              </p>
                            )}
                            {q.follow_up_prompts?.length > 0 && (
                              <div className="space-y-1 pl-2 border-l-2 border-indigo-200">
                                <span className="text-[11px] font-semibold text-slate-600">Suggested Follow-up Probes:</span>
                                {q.follow_up_prompts.map((p, pIdx) => (
                                  <div key={pIdx} className="text-slate-600 text-[11px]">
                                    • {p}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                          {aiQuestions.disclaimer} • Provider: {aiQuestions.provider}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
