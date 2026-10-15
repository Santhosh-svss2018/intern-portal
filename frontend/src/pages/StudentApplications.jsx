import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import {
  FileText,
  Video,
  Star,
  Eye,
  Clock,
  Sparkles,
  Calendar,
  Send,
  Building2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

const STATUS_CONFIG = {
  applied: {
    label: 'Applied',
    title: 'Application Submitted',
    color: 'bg-slate-500',
    dotBg: 'bg-slate-100 text-slate-700 border-slate-300',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Send,
  },
  in_review: {
    label: 'Under Review',
    title: 'Under Review',
    color: 'bg-blue-600',
    dotBg: 'bg-blue-100 text-blue-700 border-blue-300',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Eye,
  },
  shortlisted: {
    label: 'Shortlisted',
    title: 'Shortlisted by Recruiter',
    color: 'bg-teal-600',
    dotBg: 'bg-teal-100 text-teal-700 border-teal-300',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: Star,
  },
  interview: {
    label: 'Interview',
    title: 'Interview Scheduled',
    color: 'bg-indigo-600',
    dotBg: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Video,
  },
  accepted: {
    label: 'Selected',
    title: 'Candidate Selected / Offer Extended',
    color: 'bg-emerald-600',
    dotBg: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Declined',
    title: 'Application Declined',
    color: 'bg-rose-600',
    dotBg: 'bg-rose-100 text-rose-700 border-rose-300',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: XCircle,
  },
};

const PIPELINE_STEPS = [
  { key: 'applied', label: 'Applied' },
  { key: 'in_review', label: 'Under Review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'decision', label: 'Decision' },
];

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTimelines, setExpandedTimelines] = useState({});
  const navigate = useNavigate();

  const fetchApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/applications/my');
      setApplications(res.data);
      // Default open the timeline for all active applications
      const initExpanded = {};
      res.data.forEach((app) => {
        initExpanded[app.id] = true;
      });
      setExpandedTimelines(initExpanded);
    } catch (err) {
      console.error(err);
      setError('Unable to load your applications. Please verify your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const toggleTimeline = (id) => {
    setExpandedTimelines((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.applied;
    const IconComponent = config.icon;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${config.badge}`}>
        <IconComponent className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Unknown date';
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (e) {
      // ignore
    }
    return ts;
  };

  const getStepStatus = (stepKey, appStatus) => {
    const order = ['applied', 'in_review', 'shortlisted', 'interview', 'decision'];
    const currentIdx =
      appStatus === 'accepted' || appStatus === 'rejected'
        ? 4
        : order.indexOf(appStatus);

    const stepIdx = order.indexOf(stepKey);

    if (stepKey === 'decision') {
      if (appStatus === 'accepted') return 'accepted';
      if (appStatus === 'rejected') return 'rejected';
      return 'pending';
    }

    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'pending';
  };

  const filteredApps = applications.filter((app) => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  });

  return (
    <AppLayout activeTab="applications" title="My Applications" breadcrumbs={['Track Applications']}>
      <div className="space-y-6 animate-fade-in">
        {/* Header Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Application Pipeline Tracker</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status milestones, AI competency match, and recruiter feedback timeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              {applications.length} Total Submissions
            </span>
            <button
              onClick={() => navigate('/student/explore')}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
            >
              Discover More
            </button>
          </div>
        </div>

        {/* Error State with Retry Button */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-800">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchApps}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {[
            { label: 'All', value: 'all' },
            { label: 'Applied', value: 'applied' },
            { label: 'Under Review', value: 'in_review' },
            { label: 'Shortlisted', value: 'shortlisted' },
            { label: 'Interviews', value: 'interview' },
            { label: 'Selected', value: 'accepted' },
            { label: 'Declined', value: 'rejected' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Application Cards List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
                <div className="h-12 bg-slate-50 rounded" />
              </div>
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">No applications in this view</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Ready to take the next step in your engineering career? Explore live opportunities today.
            </p>
            <button
              onClick={() => navigate('/student/explore')}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
            >
              Explore Opportunities
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map((app) => {
              const hasHistory = Array.isArray(app.status_history) && app.status_history.length > 0;
              const isExpanded = !!expandedTimelines[app.id];

              return (
                <article
                  key={app.id}
                  className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all space-y-4"
                >
                  {/* Top Bar: Company, Title, Date & Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        {app.company_name}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {app.internship_title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Submitted: {app.applied_at || 'Recently'}
                        </span>
                        {app.id && (
                          <span className="font-mono text-[11px] text-slate-300">
                            #{app.id.slice(-6)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>{getStatusBadge(app.status)}</div>
                  </div>

                  {/* Pipeline Progress Stepper */}
                  <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                      Recruitment Pipeline Progress
                    </div>
                    <div className="grid grid-cols-5 gap-1 relative">
                      {PIPELINE_STEPS.map((step, idx) => {
                        const stepState = getStepStatus(step.key, app.status);
                        let dotColor = 'bg-slate-200 text-slate-500';
                        let labelColor = 'text-slate-400';
                        let barColor = 'bg-slate-200';

                        if (stepState === 'completed') {
                          dotColor = 'bg-indigo-600 text-white';
                          labelColor = 'text-indigo-950 font-semibold';
                          barColor = 'bg-indigo-600';
                        } else if (stepState === 'current') {
                          dotColor = 'bg-indigo-500 text-white ring-4 ring-indigo-100';
                          labelColor = 'text-indigo-700 font-bold';
                        } else if (stepState === 'accepted') {
                          dotColor = 'bg-emerald-600 text-white ring-4 ring-emerald-100';
                          labelColor = 'text-emerald-700 font-bold';
                        } else if (stepState === 'rejected') {
                          dotColor = 'bg-rose-500 text-white ring-4 ring-rose-100';
                          labelColor = 'text-rose-700 font-bold';
                        }

                        return (
                          <div key={step.key} className="flex flex-col items-center text-center">
                            <div className="w-full flex items-center mb-1.5">
                              <div
                                className={`flex-1 h-1 rounded-l ${
                                  idx === 0 ? 'invisible' : barColor
                                }`}
                              />
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold transition-all ${dotColor}`}
                              >
                                {stepState === 'completed' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : stepState === 'rejected' ? (
                                  <XCircle className="w-3.5 h-3.5" />
                                ) : (
                                  idx + 1
                                )}
                              </div>
                              <div
                                className={`flex-1 h-1 rounded-r ${
                                  idx === PIPELINE_STEPS.length - 1 ? 'invisible' : barColor
                                }`}
                              />
                            </div>
                            <span className={`text-[11px] truncate max-w-full ${labelColor}`}>
                              {step.key === 'decision' && app.status === 'rejected'
                                ? 'Declined'
                                : step.key === 'decision' && app.status === 'accepted'
                                ? 'Accepted'
                                : step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Match Insight Callout */}
                  {app.ai_insight && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-indigo-900">
                          {app.ai_match_percentage}% Verified Competency Match
                        </span>
                        <p className="text-slate-600 mt-0.5 leading-relaxed">{app.ai_insight}</p>
                      </div>
                    </div>
                  )}

                  {/* Interview Action Banner */}
                  {app.interview_date && (
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-indigo-950">{app.interview_date}</div>
                          <div className="text-indigo-700 mt-0.5">
                            {app.interview_notes || 'Technical Phone Screen'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => alert(`Launching interview link for ${app.company_name}...`)}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Meeting
                      </button>
                    </div>
                  )}

                  {/* Application Tracking Timeline Accordion */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => toggleTimeline(app.id)}
                      className="w-full flex items-center justify-between py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        Application Tracking Timeline
                        <span className="text-[11px] font-normal text-slate-400">
                          ({hasHistory ? `${app.status_history.length} event${app.status_history.length > 1 ? 's' : ''}` : 'Legacy record'})
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        {isExpanded ? 'Collapse' : 'View Full History'}
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pl-1">
                        {hasHistory ? (
                          <div className="relative pl-5 border-l-2 border-indigo-100 space-y-4 my-2">
                            {app.status_history.map((event, eventIdx) => {
                              const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.applied;
                              const IconComponent = config.icon;
                              const isLatest = eventIdx === app.status_history.length - 1;

                              let actorLabel = 'Candidate Submission';
                              if (event.actor_role === 'company' || event.actor_role === 'recruiter') {
                                actorLabel = 'Recruiter Action';
                              } else if (event.actor_role === 'admin') {
                                actorLabel = 'System / Administrator';
                              }

                              return (
                                <div key={eventIdx} className="relative group">
                                  {/* Node bullet */}
                                  <div
                                    className={`absolute -left-[27px] top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shadow-xs transition-all ${
                                      isLatest
                                        ? `${config.color} text-white border-white ring-2 ring-indigo-200`
                                        : 'bg-white border-slate-300 text-slate-500'
                                    }`}
                                  >
                                    <IconComponent className="w-2.5 h-2.5" />
                                  </div>

                                  {/* Event Content Box */}
                                  <div className="bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900">
                                          {config.title}
                                        </span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                                          {actorLabel}
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        {formatTimestamp(event.timestamp)}
                                      </span>
                                    </div>

                                    {/* Recruiter / Event Feedback Callout */}
                                    {event.feedback && (
                                      <div className="mt-2.5 p-2.5 bg-white border border-amber-200 rounded-md text-xs text-slate-700 shadow-2xs flex items-start gap-2">
                                        <MessageSquare className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <div className="space-y-0.5">
                                          <div className="text-[11px] font-bold text-amber-900">
                                            Recruiter Note / Feedback:
                                          </div>
                                          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                            {event.feedback}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Legacy Record State: Explains why older timeline is not present without fabricating timestamps */
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-600 my-2">
                            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-800">
                                Legacy Application Tracking
                              </span>
                              <p className="mt-0.5 text-slate-500 leading-relaxed">
                                Detailed chronological milestone history is unavailable for submissions created prior to timeline integration. Current recorded status is{' '}
                                <strong className="text-slate-700">{app.status?.toUpperCase()}</strong>.
                                All future status transitions will be captured in the real-time timeline.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
