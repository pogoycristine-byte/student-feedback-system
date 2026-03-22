import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://student-feedback-backend-1xw4.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/update-profile', data),
};

export const feedbackAPI = {
  // Text-only submission (no media)
  submit: (data) => api.post('/feedback', data),

  // Submission with photo or video
  submitWithMedia: async (data, mediaFiles = []) => {
    const form = new FormData();

    form.append('category', data.category);
    form.append('subject', data.subject);
    form.append('teacherName', data.teacherName || '');
    form.append('description', data.description);
    form.append('priority', data.priority);
    form.append('location', data.location || 'TMC Main Campus');
    form.append('dateTime', data.dateTime || '');

    mediaFiles.forEach((file, index) => {
      const isVideo = file.type === 'video' || file.mimeType?.startsWith('video/');
      const mimeType = file.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
      const extension = file.uri.split('?')[0].split('.').pop() || (isVideo ? 'mp4' : 'jpg');

      form.append('media', {
        uri: file.uri,
        type: mimeType,
        name: `media_${Date.now()}_${index}.${extension}`,
      });
    });

    const token = await SecureStore.getItemAsync('token');

    return axios.post(`${API_URL}/feedback`, form, {
      timeout: 60000,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  getMyFeedback: (params) => api.get('/feedback/my-feedback', { params }),
  getById: (id) => api.get(`/feedback/${id}`),

  // Chat/Message functions
  sendMessage: (feedbackId, message) => api.post(`/feedback/${feedbackId}/message`, { message }),
  getMessages: (feedbackId) => api.get(`/feedback/${feedbackId}/messages`),

  // Rating function
  submitRating: (feedbackId, ratingData) => api.put(`/feedback/${feedbackId}/rate`, ratingData),
};

export const categoryAPI = {
  getAll: () => api.get('/categories'),
};

// ── NEW: Announcements ──
export const announcementAPI = {
  getActive: () => api.get('/announcements'),
};

export default api;