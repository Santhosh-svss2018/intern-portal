import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Sparkles,
  GraduationCap,
  Building2,
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  X,
  AlertCircle,
  KeyRound,
  ChevronDown,
} from 'lucide-react';

export default function Login() {
  const { login, register, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Primary credentials state - clean defaults without hardcoded production values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Development sandbox drawer (explicit developer convenience, collapsed by default)
  const [showDevSandbox, setShowDevSandbox] = useState(false);

  // Sign up form state
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [signupTrack, setSignupTrack] = useState('student');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupOrg, setSignupOrg] = useState('');
  const [signupTitle, setSignupTitle] = useState('');
  const [signupError, setSignupError] = useState('');

  // Password reset modal state (2-step cryptographic token workflow)
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = request token, 2 = enter token & new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsSignUpOpen(true);
    }
    const roleParam = searchParams.get('role');
    if (roleParam === 'company') {
      setSignupTrack('company');
    }
  }, [searchParams]);

  const demoRoles = [
    {
      name: 'Student',
      email: 'student@university.edu',
      label: 'Student Candidate',
      desc: 'Browse roles, track application status, and complete deliverables',
      icon: GraduationCap,
    },
    {
      name: 'Company',
      email: 'recruiter@enterprise.com',
      label: 'Enterprise Recruiter',
      desc: 'Publish postings, review candidates, and manage hiring pipeline',
      icon: Building2,
    },
    {
      name: 'Mentor',
      email: 'mentor@industry.org',
      label: 'Faculty Mentor',
      desc: 'Oversee assigned student deliverables, evaluate PRs, and give feedback',
      icon: UserCheck,
    },
    {
      name: 'Admin',
      email: 'admin@internconnect.ai',
      label: 'Platform Admin',
      desc: 'User management, mentor assignments, announcements, and compliance',
      icon: ShieldCheck,
    },
  ];

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const user = await login(email.trim(), password);
      if (user.role === 'student') navigate('/student');
      else if (user.role === 'company') navigate('/company');
      else if (user.role === 'mentor') navigate('/mentor');
      else if (user.role === 'admin') navigate('/admin');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Authentication failed. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevQuickFill = (roleName) => {
    const target = demoRoles.find((r) => r.name === roleName);
    if (target) {
      setEmail(target.email);
      setPassword('password123');
      setErrorMsg('');
    }
  };

  const handleDirectDemoSwitch = async (roleName) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await switchDemoRole(roleName);
      if (user.role === 'student') navigate('/student');
      else if (user.role === 'company') navigate('/company');
      else if (user.role === 'mentor') navigate('/mentor');
      else if (user.role === 'admin') navigate('/admin');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to switch demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');
    try {
      const user = await register({
        email: signupEmail.trim(),
        password: signupPassword,
        full_name: signupName.trim(),
        role: signupTrack,
        organization: signupOrg.trim(),
        title: signupTitle.trim(),
      });
      setIsSignUpOpen(false);
      if (user.role === 'student') navigate('/student');
      else if (user.role === 'company') navigate('/company');
      else if (user.role === 'mentor') navigate('/mentor');
      else if (user.role === 'admin') navigate('/admin');
    } catch (err) {
      setSignupError(err.response?.data?.detail || 'Registration failed. Email may already be in use.');
    }
  };

  // Step 1: Request one-time reset token
  const handleRequestResetToken = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setIsResetting(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: resetEmail.trim() });
      if (res.data.reset_token) {
        setResetToken(res.data.reset_token);
        setResetSuccess('Reset token generated. Enter your new password below.');
        setResetStep(2);
      } else {
        setResetSuccess(res.data.message || 'If an account exists, a reset token was created.');
      }
    } catch (err) {
      setResetError(err.response?.data?.detail || 'Failed to initiate password reset.');
    } finally {
      setIsResetting(false);
    }
  };

  // Step 2: Confirm new password with token
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setIsResetting(true);
    try {
      await api.post('/auth/reset-password', {
        token: resetToken.trim(),
        new_password: newPassword,
      });
      setResetSuccess('🎉 Password updated successfully! Redirecting to sign in...');
      setEmail(resetEmail);
      setTimeout(() => {
        setIsForgotOpen(false);
        setResetStep(1);
        setResetToken('');
        setNewPassword('');
        setResetSuccess('');
      }, 2000);
    } catch (err) {
      setResetError(err.response?.data?.detail || 'Failed to reset password. Token may be invalid or expired.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-teal-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          InternConnect <span className="text-indigo-600">AI</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Enterprise Internship Management Platform & Career Intelligence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-2xl space-y-5">
          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2 animate-fade-in font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* CREDENTIAL LOGIN FORM */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@organization.com"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotOpen(true);
                    setResetStep(1);
                    setResetError('');
                    setResetSuccess('');
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-9 py-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-70"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign in to Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Footer Register Link */}
          <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
            Don't have an account yet?{' '}
            <button
              onClick={() => setIsSignUpOpen(true)}
              className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Create Account
            </button>
          </div>

          {/* COLLAPSIBLE DEVELOPMENT SANDBOX ACCORDION */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDevSandbox(!showDevSandbox)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 py-1 cursor-pointer"
            >
              <span>Developer Demo Accounts (Sandbox Only)</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDevSandbox ? 'rotate-180' : ''}`} />
            </button>

            {showDevSandbox && (
              <div className="mt-2.5 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs animate-fade-in">
                <p className="text-[10px] text-slate-500 mb-1.5">
                  Click below to quickly load pre-seeded development accounts:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {demoRoles.map((dr) => (
                    <button
                      key={dr.name}
                      type="button"
                      onClick={() => handleDevQuickFill(dr.name)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-left cursor-pointer transition-colors"
                    >
                      <div className="font-bold text-slate-800 text-[11px]">{dr.label}</div>
                      <div className="text-[9px] text-slate-400 font-mono truncate">{dr.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Telemetry Badge */}
        <div className="text-center mt-6 text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>MongoDB Atlas Live Persistence • JWT RBAC Auth • 256-Bit SSL</span>
        </div>
      </div>

      {/* SIGN UP MODAL */}
      {isSignUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Account</h3>
              <button onClick={() => setIsSignUpOpen(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {signupError && (
              <div className="p-2.5 bg-rose-50 text-rose-800 rounded-lg text-xs font-medium">
                {signupError}
              </div>
            )}

            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Track / Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'student', label: 'Student' },
                    { id: 'company', label: 'Company' },
                    { id: 'mentor', label: 'Mentor' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSignupTrack(t.id)}
                      className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        signupTrack === t.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name or Organization Name</label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  required
                  placeholder="e.g. Jane Doe or Horizon Tech"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  placeholder="user@domain.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 6 characters)</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {signupTrack === 'student' ? 'University / College' : signupTrack === 'company' ? 'Industry Sector' : 'Affiliation / Title'}
                </label>
                <input
                  type="text"
                  value={signupOrg}
                  onChange={(e) => setSignupOrg(e.target.value)}
                  placeholder={signupTrack === 'student' ? 'e.g. UC Berkeley' : 'e.g. Software & Cloud'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSignUpOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                >
                  Register Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2-STEP CRYPTOGRAPHIC FORGOT / RESET PASSWORD MODAL */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {resetStep === 1 ? 'Reset Password' : 'Enter New Password'}
                </h3>
              </div>
              <button
                onClick={() => setIsForgotOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-2.5 bg-rose-50 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleRequestResetToken} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Enter your registered email address. A secure, single-use reset token will be created.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="name@university.edu"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResetStep(2)}
                    className="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                  >
                    Already have a token?
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-60"
                  >
                    {isResetting ? 'Generating...' : 'Request Token'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Enter the one-time reset token provided by your administrator or generated in testing, then set your new password.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">One-Time Reset Token</label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    placeholder="Paste secure token"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (min 6 chars)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="text-[11px] text-slate-500 font-medium hover:underline cursor-pointer"
                  >
                    Back to Request
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer disabled:opacity-60"
                  >
                    {isResetting ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
