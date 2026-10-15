import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import StudentExplore from './pages/StudentExplore';
import InternshipDetail from './pages/InternshipDetail';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import StudentApplications from './pages/StudentApplications';
import StudentTasks from './pages/StudentTasks';
import AICoach from './pages/AICoach';
import CompanyDashboard from './pages/CompanyDashboard';
import MentorDashboard from './pages/MentorDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Helper component to smoothly reset scroll on every navigation
function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Public Pages */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/explore" element={<StudentExplore />} />
              <Route path="/student/explore" element={<Navigate to="/explore" replace />} />
              <Route path="/internships/:id" element={<InternshipDetail />} />

              {/* Student Protected Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <StudentProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={<Navigate to="/student/profile" replace />}
              />
              <Route
                path="/student/applications"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <StudentApplications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applications"
                element={<Navigate to="/student/applications" replace />}
              />
              <Route
                path="/student/tasks"
                element={
                  <ProtectedRoute allowedRoles={['student', 'mentor', 'admin']}>
                    <StudentTasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={<Navigate to="/student/tasks" replace />}
              />
              <Route
                path="/student/ai-coach"
                element={
                  <ProtectedRoute allowedRoles={['student', 'company', 'mentor', 'admin']}>
                    <AICoach />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-coach"
                element={<Navigate to="/student/ai-coach" replace />}
              />

              {/* Company / Recruiter Routes */}
              <Route
                path="/company"
                element={
                  <ProtectedRoute allowedRoles={['company', 'admin']}>
                    <CompanyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruiter"
                element={<Navigate to="/company" replace />}
              />

              {/* Mentor Routes */}
              <Route
                path="/mentor"
                element={
                  <ProtectedRoute allowedRoles={['mentor', 'admin']}>
                    <MentorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
