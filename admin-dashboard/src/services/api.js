import axios from 'axios';

const API_URL = 'https://student-feedback-backend-1xw4.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
};

export const feedbackAPI = {
  getAll: (params) => api.get('/feedback', { params }),
  getById: (id) => api.get(`/feedback/${id}`),
  updateStatus: (id, data) => api.put(`/feedback/${id}/status`, data),
  delete: (id) => api.delete(`/feedback/${id}`),

  // Chat functions
  sendMessage: (id, message) => api.post(`/feedback/${id}/message`, { message }),
  getMessages: (id) => api.get(`/feedback/${id}/messages`),
};

export const categoryAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  toggleStatus: (id) => api.put(`/users/${id}/toggle-status`),
  delete: (id) => api.delete(`/users/${id}`),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getTrends: (period) => api.get('/analytics/trends', { params: { period } }),
};

// ── Announcements API ──
export const announcementAPI = {
  getAll:  ()         => api.get('/announcements'),
  create:  (data)     => api.post('/announcements', data),
  update:  (id, data) => api.put(`/announcements/${id}`, data),
  remove:  (id)       => api.delete(`/announcements/${id}`),
};

export default api;