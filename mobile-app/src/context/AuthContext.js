import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  // ✅ ADDED: heartbeat — updates lastSeen every 30s so admin sees correct online status
  useEffect(() => {
    if (!user) return;

    // Send immediately when user logs in or app loads
    authAPI.heartbeat().catch(() => {});

    // Then every 30 seconds
    const interval = setInterval(() => {
      authAPI.heartbeat().catch(() => {});
    }, 30 * 1000);

    // Also send when app comes back to foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        authAPI.heartbeat().catch(() => {});
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [user]);

  const loadUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userData = await SecureStore.getItemAsync('user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data;
      
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token, user } = response.data;
      
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  };

  // ✅ FIXED: use functional setUser to always get the latest user, avoiding stale closure
  const updateUser = async (updatedFields) => {
    try {
      setUser(prevUser => {
        const updatedUser = { ...prevUser, ...updatedFields };
        // persist to SecureStore in the background
        SecureStore.setItemAsync('user', JSON.stringify(updatedUser)).catch(err =>
          console.error('Error persisting updated user:', err)
        );
        return updatedUser;
      });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const setUserAndStore = async (userData) => {
    try {
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error persisting user:', error);
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser: setUserAndStore, login, register, logout, loading, updateUser }}>
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