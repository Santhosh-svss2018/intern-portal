import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import {
  CheckSquare,
  GitPullRequest,
  Clock,
  UserCheck,
  MessageSquare,
  Send,
  CheckCircle2,
  X,
  AlertCircle,
  FileCode,
  Calendar,
} from 'lucide-react';

export default function StudentTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submit Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [prInfo, setPrInfo] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleOpenSubmit = (task) => {
    setSelectedTask(task);
    setPrInfo(task.pr_info || '');
    setSubmissionNotes(task.submission_notes || '');
    setSubmitModalOpen(true);
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      await api.post(`/tasks/${selectedTask.id}/submit`, {
        pr_info: prInfo,
        submission_notes: submissionNotes,
      });
      setSuccessMsg('✅ Pull request submitted to supervisor review queue!');
      setSubmitModalOpen(false);
      fetchTasks();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout activeTab="tasks" title="Mentorship Tasks" breadcrumbs={['Tasks & Deliverables']}>
      <div className="space-y-6 animate-fade-in">
        {/* Header Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Engineering Tasks & Sprint Milestones</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit code pull requests, review supervisor feedback, and track milestone completion.
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
            {tasks.length} Assigned Deliverables
          </span>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-slide-up">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="p-1 text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Task Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-10 bg-slate-50 rounded" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">No assigned tasks right now</h3>
            <p className="text-xs text-slate-500 mt-1">
              Your industry mentor will assign milestones and tasks once your internship begins.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <article
                key={task.id}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-indigo-600">{task.intern_role || 'Engineering Intern'}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        Supervisor: <strong>{task.mentor_name || 'Assigned Mentor'}</strong>
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{task.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        task.priority === 'high'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {task.priority || 'Normal'} Priority
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        task.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : task.status === 'submitted'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>

                {/* PR & Deadline Bar */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <GitPullRequest className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{task.pr_info || 'Draft PR pending initial submission'}</span>
                  </div>
                  <span className="text-slate-500 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Deadline: <strong>{task.deadline || 'Flexible'}</strong>
                  </span>
                </div>

                {/* Supervisor Feedback */}
                {task.supervisor_feedback && (
                  <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-100 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Supervisor Feedback ({task.mentor_name}):</span>
                    </div>
                    <p className="text-slate-700 italic pl-5 leading-relaxed">
                      "{task.supervisor_feedback}"
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenSubmit(task)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{task.status === 'submitted' ? 'Update Submission' : 'Submit PR & Notes'}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* SUBMIT MODAL */}
        {submitModalOpen && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submit Deliverable</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedTask.title}</p>
                </div>
                <button
                  onClick={() => setSubmitModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GitHub PR Reference or Commit URL
                  </label>
                  <input
                    type="text"
                    value={prInfo}
                    onChange={(e) => setPrInfo(e.target.value)}
                    placeholder="PR #143 • 8 files changed (https://github.com/...)"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Implementation Notes for Supervisor
                  </label>
                  <textarea
                    rows={4}
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Summarize architectural trade-offs, testing coverage, and edge cases handled..."
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSubmitModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit to Mentor
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
