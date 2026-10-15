import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Sparkles,
  CheckSquare,
  Clock,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  X,
  MessageSquare,
  Plus,
  UserCheck,
  Award,
  ArrowRight,
  TrendingUp,
  FileCode,
} from 'lucide-react';

export default function MentorDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Featured review task state
  const [feedbackText, setFeedbackText] = useState(
    'Solid architecture on cursor tokens. Check boundary conditions when limit=0 before deployment.'
  );
  const [refiningAi, setRefiningAi] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  // Assign New Task Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [candidateStudents, setCandidateStudents] = useState([]);
  const [selectedInternId, setSelectedInternId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('Friday');
  const [newTaskPriority, setNewTaskPriority] = useState('high');
  const [assignedStudents, setAssignedStudents] = useState([]);

  const fetchTasks = async () => {
    try {
      const [tasksRes, candRes, studentsRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/tasks/candidates').catch(() => ({ data: [] })),
        api.get('/tasks/students').catch(() => ({ data: [] })),
      ]);
      setTasks(tasksRes.data);
      if (candRes.data && Array.isArray(candRes.data)) {
        setCandidateStudents(candRes.data);
        if (candRes.data.length > 0) {
          setSelectedInternId((prev) => prev || candRes.data[0].id);
        }
      }
      if (studentsRes.data && Array.isArray(studentsRes.data)) {
        setAssignedStudents(studentsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAiRefine = async () => {
    setRefiningAi(true);
    try {
      const res = await api.post('/tasks/ai-refine-feedback', { feedback: feedbackText });
      setFeedbackText(res.data.refined_feedback);
      setActionNotice('✨ AI refined supervisor notes constructively!');
      setTimeout(() => setActionNotice(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setRefiningAi(false);
    }
  };

  const handleReviewAction = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}/review`, {
        status,
        supervisor_feedback: feedbackText,
      });
      setActionNotice(`Task marked as ${status.replace('_', ' ').toUpperCase()}! Feedback saved.`);
      fetchTasks();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    const targetInternId = selectedInternId || candidateStudents[0]?.id || user?.id;
    try {
      await api.post('/tasks', {
        intern_id: targetInternId,
        title: newTaskTitle,
        description: newTaskDesc,
        deadline: newTaskDeadline,
        priority: newTaskPriority,
        milestone: 'Milestone 1',
      });
      setActionNotice('🎉 New deliverable assigned and candidate notified!');
      setIsAssignModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      fetchTasks();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Compute real mentees roster from backend assigned students with task calculations
  const mentees = React.useMemo(() => {
    if (assignedStudents && assignedStudents.length > 0) {
      return assignedStudents.map((s) => ({
        id: s.id,
        name: s.full_name || s.email,
        role: s.profile?.degree || 'Candidate Intern',
        university: s.profile?.university || 'Assigned Mentee',
        total: s.task_stats?.total || 0,
        approved: s.task_stats?.approved || 0,
        percent: s.task_stats?.completion_rate || 0,
      }));
    }
    const map = new Map();
    tasks.forEach((t) => {
      const id = t.intern_id || 'unknown';
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: t.intern_name || 'Student Candidate',
          role: t.intern_role || 'Engineering Intern',
          university: t.intern_university || 'Student',
          total: 0,
          approved: 0,
        });
      }
      const m = map.get(id);
      m.total += 1;
      if (t.status === 'approved') m.approved += 1;
    });
    return Array.from(map.values()).map((m) => ({
      ...m,
      percent: m.total > 0 ? Math.round((m.approved / m.total) * 100) : 0,
    }));
  }, [assignedStudents, tasks]);

  const featuredTask = tasks.find((t) => t.status === 'submitted') || tasks[0];

  return (
    <AppLayout activeTab="overview" title="Mentorship Hub & Review Studio" breadcrumbs={['Mentor Hub']}>
      <div className="space-y-6 animate-fade-in">
        {/* Mentor Profile Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-700 shrink-0">
              <UserCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{user?.full_name || user?.email || 'Faculty Advisor'}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  Industry Advisor
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {user?.profile?.title || 'Academic & Industry Mentorship Supervisor'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Assign New Milestone Task
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

        {/* 4 MENTOR METRIC KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Mentees</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">{mentees.length}</div>
            <div className="mt-1 text-xs text-indigo-600 font-medium">
              {mentees.length > 0 ? `${mentees.length} assigned candidate${mentees.length > 1 ? 's' : ''}` : 'No active mentees'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PR Reviews Pending</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
              {tasks.filter((t) => t.status === 'submitted').length}
            </div>
            <div className="mt-1 text-xs text-amber-600 font-medium">Awaiting supervisor review</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved Deliverables</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700 tracking-tight">
              {tasks.filter((t) => t.status === 'approved').length}
            </div>
            <div className="mt-1 text-xs text-emerald-600 font-medium">Merged into main branches</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Progress</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-teal-700 tracking-tight">
              {tasks.length > 0 ? `${Math.round((tasks.filter((t) => t.status === 'approved').length / tasks.length) * 100)}%` : '0%'}
            </div>
            <div className="mt-1 text-xs text-teal-600 font-medium">
              {tasks.length > 0 ? `${tasks.length} total deliverables` : 'No deliverables'}
            </div>
          </div>
        </div>

        {/* 2-COLUMN MENTORSHIP WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMN 1 & 2: PENDING CODE REVIEW & SUPERVISOR STUDIO */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Active Code Review Queue</h3>
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  Deliverable Review
                </span>
              </div>

              {featuredTask ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900">{featuredTask.title}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">Candidate: <strong>{featuredTask.intern_name || 'Assigned Candidate'}</strong></span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{featuredTask.description}</p>
                  </div>

                  {/* Submission Details */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <FileCode className="w-4 h-4" />
                        {featuredTask.pr_info || 'No PR submitted yet'}
                      </span>
                      <span className="text-slate-400">Due: {featuredTask.deadline}</span>
                    </div>
                    <p className="text-slate-600 italic">
                      Notes from Intern: "{featuredTask.submission_notes || 'No submission notes provided.'}"
                    </p>
                  </div>

                  {/* Supervisor Inline Feedback with AI Refiner */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        Supervisor Technical Coaching & Feedback
                      </label>
                      <button
                        type="button"
                        onClick={handleAiRefine}
                        disabled={refiningAi}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                        <span>{refiningAi ? 'Refining...' : 'Refine with AI'}</span>
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 leading-relaxed resize-none"
                    />

                    {/* Review Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleReviewAction(featuredTask.id, 'revision_requested')}
                        className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                      >
                        Request Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewAction(featuredTask.id, 'approved')}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Merge Deliverable
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No tasks awaiting review.</p>
              )}
            </div>
          </div>

          {/* COLUMN 3: MENTEES ROSTER */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Assigned Mentees Roster</h3>
                <span className="text-xs text-slate-500 font-medium">{mentees.length} Active</span>
              </div>

              {mentees.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No students currently assigned to your advisory roster. Contact an administrator to be assigned mentees.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {mentees.map((intern, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{intern.name}</h4>
                          <p className="text-[11px] text-slate-500">{intern.university}</p>
                          <p className="text-[11px] font-medium text-indigo-600 mt-0.5">{intern.role}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-800">{intern.percent}%</span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${intern.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ASSIGN TASK MODAL */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Assign New Mentorship Deliverable</h3>
                </div>
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign to Student Candidate</label>
                  <select
                    value={selectedInternId}
                    onChange={(e) => setSelectedInternId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {candidateStudents.length === 0 ? (
                      <option value="">No registered students found</option>
                    ) : (
                      candidateStudents.map((cand) => (
                        <option key={cand.id} value={cand.id}>
                          {cand.full_name} ({cand.email})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deliverable Title</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Implement idempotency keys in payment router"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deliverable Scope & Criteria</label>
                  <textarea
                    rows={3}
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Describe expected behavior, unit test thresholds, and architectural references..."
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Deadline</label>
                    <input
                      type="text"
                      value={newTaskDeadline}
                      onChange={(e) => setNewTaskDeadline(e.target.value)}
                      placeholder="e.g. Next Friday"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="high">High Priority</option>
                      <option value="normal">Normal Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
                  >
                    Assign Deliverable
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
