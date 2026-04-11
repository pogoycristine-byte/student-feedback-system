import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const API_URL = 'https://student-feedback-backend-1xw4.onrender.com/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const heartbeatRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    const ping = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        await fetch(`${API_URL}/auth/heartbeat`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (e) {
        // Silently ignore — heartbeat failures shouldn't disrupt the user
      }
    };

    ping();
    heartbeatRef.current = setInterval(ping, 5 * 1000); // ← Every 5 seconds

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [user]);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.setItem('fromLogout', 'true'); // ← tells Login to skip landing page
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
