import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const DEMO_CREDENTIALS = {
  student: { email: 'student@university.edu', password: 'password123' },
  company: { email: 'recruiter@enterprise.com', password: 'password123' },
  mentor: { email: 'mentor@industry.org', password: 'password123' },
  admin: { email: 'admin@internconnect.ai', password: 'password123' },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
          if (err.response?.status === 401 || err.response?.status === 403) {
            setToken('');
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          } else {
            console.warn('Session verification network error:', err);
          }
        }
      }
      setLoading(false);
    };

    verifySession();

    const handleUnauthorized = () => {
      setToken('');
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const register = async (registerData) => {
    const res = await api.post('/auth/register', registerData);
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const switchDemoRole = async (targetRole) => {
    const roleKey = targetRole.toLowerCase();
    const creds = DEMO_CREDENTIALS[roleKey];
    if (creds) {
      return await login(creds.email, creds.password);
    }
  };

  const updateUserProfile = (newProfileData) => {
    setUser((prev) => {
      const updated = { ...prev, profile: { ...prev?.profile, ...newProfileData } };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || 'student',
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        switchDemoRole,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
