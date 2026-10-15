import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Search,
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  Lock,
  Layers,
  Terminal,
  ExternalLink,
  Users,
  Award,
} from 'lucide-react';

export default function LandingPage() {
  const { user, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const [featuredInternships, setFeaturedInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/internships');
        setFeaturedInternships(res.data.slice(0, 4));
      } catch (err) {
        console.error('Failed to load featured internships:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim() || selectedCategory) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(selectedCategory)}`);
    } else {
      navigate('/explore');
    }
  };

  const categories = [
    { name: 'Software Engineering', count: 'Full-Stack, Backend, Web', icon: Code2, value: 'Software Eng' },
    { name: 'AI & Machine Learning', count: 'LLMs, PyTorch, Computer Vision', icon: Cpu, value: 'AI & ML' },
    { name: 'Data & Analytics', count: 'SQL, Python, Pipelines', icon: Database, value: 'Data Science' },
    { name: 'Cybersecurity', count: 'Infosec, Pen-Testing, Cloud', icon: Lock, value: 'Security' },
    { name: 'Product & Design', count: 'Figma, UX Research, Design Systems', icon: Layers, value: 'Product' },
    { name: 'Cloud & Infrastructure', count: 'AWS, Docker, Kubernetes', icon: Terminal, value: 'DevOps' },
  ];

  const roleDashboardPath =
    role === 'company' ? '/company' : role === 'mentor' ? '/mentor' : role === 'admin' ? '/admin' : '/student';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* PUBLIC NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-teal-300" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg tracking-tight">InternConnect</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                AI
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to="/explore" className="hover:text-indigo-600 transition-colors">
              Explore Internships
            </Link>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">
              How It Works
            </a>
            <a href="#categories" className="hover:text-indigo-600 transition-colors">
              Role Categories
            </a>
            <Link to="/login?role=company" className="hover:text-indigo-600 transition-colors">
              For Employers
            </Link>
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to={roleDashboardPath}
                className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-xs flex items-center gap-1.5"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-700 hover:text-indigo-600 px-3 py-1.5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?mode=signup"
                  className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-xs"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Trust Banner Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>Live Cloud Database Connected • MongoDB Atlas Cluster0 Active</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            The Premier Platform for <br className="hidden sm:inline" />
            <span className="text-indigo-600">High-Growth Tech Internships</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Connect with vetted engineering teams, evaluate match readiness with AI competency insights, and gain actionable industry mentorship.
          </p>

          {/* Search Box */}
          <div className="mt-10 max-w-3xl mx-auto bg-white p-3 rounded-2xl shadow-lg border border-slate-200">
            <form onSubmit={handleHeroSearch} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Role, programming language, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700 bg-white"
                >
                  <option value="">All Categories</option>
                  <option value="Software Eng">Software Eng</option>
                  <option value="AI & ML">AI & ML</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Security">Cybersecurity</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                Explore Roles
              </button>
            </form>
          </div>

          {/* Quick Filter Pill Tags */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-400">Popular searches:</span>
            {['React', 'Python', 'Distributed Systems', 'Remote', 'Machine Learning'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => navigate(`/explore?search=${encodeURIComponent(tag)}`)}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORM VALUE HIGHLIGHTS */}
      <section className="py-12 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Verified Employers</h4>
                <p className="text-xs text-slate-500 mt-1">Every company posting is moderated and authenticated by administrators.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">AI Competency Fit</h4>
                <p className="text-xs text-slate-500 mt-1">Algorithmic skill matching and role-specific interview prep generation.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Dedicated Mentorship</h4>
                <p className="text-xs text-slate-500 mt-1">Assigned industry mentors guide real project deliverables and pull requests.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Transparent Progress</h4>
                <p className="text-xs text-slate-500 mt-1">Live application pipeline tracking from submission to interview offer.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED INTERNSHIPS (LIVE FROM ATLAS) */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Live Opportunities</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Featured Engineering Openings</h2>
              <p className="text-sm text-slate-500 mt-1">Directly queried from the active database. Apply with your verified profile.</p>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View all listings
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse h-48" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredInternships.map((internship) => (
                <div
                  key={internship.id}
                  onClick={() => navigate(`/internships/${internship.id}`)}
                  className="bg-white rounded-xl p-6 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {internship.company_initial || internship.company_name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-base">
                            {internship.title}
                          </h3>
                          <div className="text-xs text-slate-500 font-medium">{internship.company_name}</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {internship.work_mode}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {internship.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {internship.skills_required?.slice(0, 4).map((skill) => (
                        <span key={skill} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4 text-slate-500">
                      <span className="font-semibold text-slate-900">{internship.stipend}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {internship.location}
                      </span>
                    </div>
                    <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                      Details
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CATEGORIES GRID */}
      <section id="categories" className="py-16 sm:py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Career Tracks</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Explore by Discipline</h2>
            <p className="text-sm text-slate-500 mt-2">Filter and apply to opportunities tailored to your technical stack and goals.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  onClick={() => navigate(`/explore?category=${encodeURIComponent(cat.value)}`)}
                  className="p-6 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm bg-white transition-all cursor-pointer flex items-start gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-indigo-50 text-slate-700 group-hover:text-indigo-600 flex items-center justify-center shrink-0 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-base">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{cat.count}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold mt-3">
                      Browse track
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Structured Pathway</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">How InternConnect AI Works</h2>
            <p className="text-sm text-slate-500 mt-2">Designed to bring transparency and efficiency to technical university recruiting.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mb-5">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Explore & Discover</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Browse verified openings from top enterprise companies. Filter by work mode, stipend, stack, and application deadline without required login.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mb-5">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Match & 1-Click Apply</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Review automated skill gap insights, generate role-specific interview preparation prompts, and submit your verified student profile.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mb-5">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Mentorship & Conversion</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Collaborate with industry mentors on milestone tasks, submit deliverables for code review, and monitor your hiring pipeline in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-16 sm:py-20 bg-indigo-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to find your next engineering internship?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-indigo-200 font-normal">
            Join thousands of university candidates using InternConnect AI to launch their technology careers.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/explore"
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-white text-indigo-900 font-semibold hover:bg-slate-100 transition-colors shadow-sm"
            >
              Browse All Openings
            </Link>
            <Link
              to="/login?mode=signup"
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-indigo-700 text-white font-semibold hover:bg-indigo-600 transition-colors border border-indigo-500"
            >
              Sign Up as Candidate
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-teal-300" />
                </div>
                <span className="font-bold text-slate-900 text-base">InternConnect AI</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Production-grade internship management portal connecting university talent, enterprise recruiters, and industry mentors.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">For Students</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><Link to="/explore" className="hover:text-indigo-600">Explore Openings</Link></li>
                <li><Link to="/student" className="hover:text-indigo-600">Student Portal</Link></li>
                <li><Link to="/student/ai-coach" className="hover:text-indigo-600">AI Career Coach</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">For Employers & Mentors</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><Link to="/company" className="hover:text-indigo-600">Recruiter Hub</Link></li>
                <li><Link to="/mentor" className="hover:text-indigo-600">Mentor Console</Link></li>
                <li><Link to="/admin" className="hover:text-indigo-600">Admin Governance</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">System Architecture</h4>
              <div className="text-xs text-slate-500 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  FastAPI + MongoDB Atlas Live
                </div>
                <div className="text-slate-400">Database: internconnect_ai</div>
                <div className="text-slate-400">SOC 2 / RBAC Enforced</div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>&copy; {new Date().getFullYear()} InternConnect AI. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <Link to="/explore" className="hover:text-slate-600">Explore</Link>
              <Link to="/login" className="hover:text-slate-600">Sign In</Link>
              <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="hover:text-slate-600 flex items-center gap-1">
                API Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
