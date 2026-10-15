import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  User,
  GraduationCap,
  Sparkles,
  Link as LinkIcon,
  GitBranch,
  Globe,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export default function StudentProfile() {
  const { user, updateUserProfile } = useAuth();

  const [formData, setFormData] = useState({
    university: '',
    degree: '',
    grad_year: '',
    phone: '',
    location: '',
    portfolio_url: '',
    github_url: '',
    linkedin_url: '',
    bio: '',
    resume_text: '',
  });

  const [skills, setSkills] = useState([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Load existing profile from user
  useEffect(() => {
    if (user?.profile) {
      const p = user.profile;
      setFormData({
        university: p.university || '',
        degree: p.degree || '',
        grad_year: p.grad_year || '',
        phone: p.phone || '',
        location: p.location || '',
        portfolio_url: p.portfolio_url || '',
        github_url: p.github_url || '',
        linkedin_url: p.linkedin_url || '',
        bio: p.bio || '',
        resume_text: p.resume_text || '',
      });
      setSkills(Array.isArray(p.skills) ? p.skills : []);
    }
  }, [user]);

  // Dynamic Profile Completeness Calculation
  const calculateCompleteness = () => {
    let score = 0;
    if (user?.full_name && user?.email) score += 20;
    if (formData.university && formData.degree) score += 20;
    if (skills && skills.length >= 3) score += 20;
    if (formData.portfolio_url || formData.github_url || formData.linkedin_url) score += 20;
    if (formData.resume_text && formData.resume_text.trim().length > 20) score += 20;
    return Math.min(score, 100);
  };

  const completeness = calculateCompleteness();

  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        ...formData,
        skills,
        readiness_score: completeness,
      };

      const res = await api.put('/auth/profile', payload);

      if (res.data.profile) {
        updateUserProfile(res.data.profile);
      } else {
        updateUserProfile(payload);
      }

      setFeedback({
        type: 'success',
        message: 'Your career profile and technical resume were updated successfully!',
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update profile. Please verify your inputs.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout activeTab="profile" title="My Career Profile" breadcrumbs={['Student', 'Career Profile']}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Completeness Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-lg">
              {completeness}%
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Profile Readiness Score</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {completeness >= 85
                  ? 'Your profile is highly competitive and ready for enterprise recruiter evaluation.'
                  : 'Add your portfolio, GitHub, and top skills to increase interview invitation rates.'}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-48">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* PERSONAL & ACADEMIC INFO */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Personal & Academic Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={user?.full_name || ''}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">University / College</label>
                <input
                  type="text"
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                  placeholder="e.g. Stanford University"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Major / Degree Track</label>
                <input
                  type="text"
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  placeholder="e.g. Computer Science & AI"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Graduation Cohort</label>
                <input
                  type="text"
                  value={formData.grad_year}
                  onChange={(e) => setFormData({ ...formData, grad_year: e.target.value })}
                  placeholder="e.g. Class of '26"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Palo Alto, CA"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-xs">Brief Bio</label>
              <textarea
                rows={2}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Share a concise elevator pitch of your engineering background and career interests..."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* TECHNICAL SKILLS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-slate-900 text-sm">Technical Skills & Competencies</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {skills.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No skills listed yet. Add technical skills, frameworks, or tools below to strengthen your profile.</p>
              ) : (
                skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-indigo-900 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Add skill (e.g. Docker, GraphQL, PyTorch)..."
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(e);
                  }
                }}
                className="max-w-xs p-2 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* PORTFOLIO & REPOSITORY LINKS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Projects & Online Presence</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Portfolio Website
                </label>
                <input
                  type="url"
                  value={formData.portfolio_url}
                  onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                  placeholder="https://yourdomain.dev"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                  GitHub Profile
                </label>
                <input
                  type="url"
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  placeholder="https://github.com/username"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* RESUME PROFILE TEXT */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-sm">Resume Highlights & Experience Summary</h3>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2">
                This text is analyzed by our skill matching engine and submitted with your one-click applications.
              </p>
              <textarea
                rows={5}
                value={formData.resume_text}
                onChange={(e) => setFormData({ ...formData, resume_text: e.target.value })}
                placeholder="Include your work experience, notable project achievements, hackathon wins, and coursework..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
