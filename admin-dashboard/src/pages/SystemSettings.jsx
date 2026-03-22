import React, { useState, useEffect } from 'react';
import { Settings, Sun, Moon, UserPlus, X, Lock, User, Bell, Info, Mail, Database, Shield, FileText, Plus, Trash2, Pencil, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api, { analyticsAPI, categoryAPI, userAPI } from '../services/api';

const TEMPLATES_KEY = 'responseTemplates';

const getTemplates = () => {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); }
  catch { return []; }
};
const saveTemplates = (templates) => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

const DEFAULT_TEMPLATES = [
  { id: 1, title: 'Acknowledgement', body: 'Thank you for submitting your feedback. We have received your concern and will review it shortly.' },
  { id: 2, title: 'Under Review',    body: 'Your feedback is currently under review. We appreciate your patience and will get back to you as soon as possible.' },
  { id: 3, title: 'Resolved',        body: 'We are pleased to inform you that your concern has been resolved. Thank you for helping us improve our services.' },
  { id: 4, title: 'Rejected',        body: 'After careful review, we are unable to act on this feedback at this time. Thank you for understanding.' },
];

const SystemSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [staffFormData, setStaffFormData] = useState({ name: '', email: '', password: '', studentId: '' });
  const [passwordFormData, setPasswordFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notificationSettings, setNotificationSettings] = useState({
    emailOnNewFeedback: true,
    emailOnStatusChange: true,
    emailOnNewMessage: true,
  });
  const [systemStats, setSystemStats] = useState({ totalUsers: '--', totalFeedback: '--', totalCategories: '--' });
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Response Templates state ──
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState({ title: '', body: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState({ title: '', body: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSystemStats();
    const savedPrefs = localStorage.getItem('notificationSettings');
    if (savedPrefs) setNotificationSettings(JSON.parse(savedPrefs));

    // Load templates — seed defaults if first time
    const saved = getTemplates();
    if (saved.length === 0) {
      saveTemplates(DEFAULT_TEMPLATES);
      setTemplates(DEFAULT_TEMPLATES);
    } else {
      setTemplates(saved);
    }
  }, []);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showStaffModal || showPasswordModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showStaffModal, showPasswordModal]);

  const fetchSystemStats = async () => {
    setStatsLoading(true);
    try {
      const [analyticsRes, categoriesRes, studentsRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        categoryAPI.getAll(),
        userAPI.getAll({ role: 'student' }),
      ]);
      const analytics = analyticsRes.data.analytics;
      const categories = categoriesRes.data.categories || [];
      setSystemStats({
        totalUsers:      analytics.totalStudents || 0,
        totalFeedback:   analytics.totalFeedback || 0,
        totalCategories: categories.filter(c => c.isActive).length,
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      setSystemStats({ totalUsers: '--', totalFeedback: '--', totalCategories: '--' });
    } finally {
      setStatsLoading(false);
    }
  };

  const handleOpenStaffModal     = () => { setStaffFormData({ name: '', email: '', password: '', studentId: '' }); setShowStaffModal(true); };
  const handleCloseStaffModal    = () => { setShowStaffModal(false); setStaffFormData({ name: '', email: '', password: '', studentId: '' }); };
  const handleOpenPasswordModal  = () => { setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' }); setShowPasswordModal(true); };
  const handleClosePasswordModal = () => { setShowPasswordModal(false); setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' }); };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (!staffFormData.name || !staffFormData.email || !staffFormData.studentId || !staffFormData.password) { alert('Please fill in all required fields'); return; }
    if (staffFormData.password.length < 6) { alert('Password must be at least 6 characters long'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(staffFormData.email)) { alert('Please enter a valid email address'); return; }
    const payload = { name: staffFormData.name.trim(), email: staffFormData.email.trim().toLowerCase(), password: staffFormData.password, studentId: staffFormData.studentId.trim() };
    try {
      await api.post('/auth/create-staff', payload);
      alert('Staff account created successfully!\n\nLogin Credentials:\nEmail: ' + payload.email + '\nStaff ID: ' + payload.studentId);
      handleCloseStaffModal();
      fetchSystemStats();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.response?.data?.error || 'Failed to create staff account'));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordFormData.currentPassword || !passwordFormData.newPassword || !passwordFormData.confirmPassword) { alert('Please fill in all fields'); return; }
    if (passwordFormData.newPassword.length < 6) { alert('New password must be at least 6 characters long'); return; }
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) { alert('New passwords do not match'); return; }
    if (passwordFormData.currentPassword === passwordFormData.newPassword) { alert('New password must be different from current password'); return; }
    try {
      await api.put('/auth/change-password', { currentPassword: passwordFormData.currentPassword, newPassword: passwordFormData.newPassword });
      alert('Password changed successfully!');
      handleClosePasswordModal();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || 'Failed to change password'));
    }
  };

  const handleNotificationToggle = (setting) => {
    const newSettings = { ...notificationSettings, [setting]: !notificationSettings[setting] };
    setNotificationSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  // ── Template handlers ──
  const handleAddTemplate = () => {
    if (!newTemplate.title.trim() || !newTemplate.body.trim()) { alert('Please fill in both title and message.'); return; }
    const updated = [...templates, { id: Date.now(), title: newTemplate.title.trim(), body: newTemplate.body.trim() }];
    setTemplates(updated);
    saveTemplates(updated);
    setNewTemplate({ title: '', body: '' });
    setShowAddForm(false);
  };

  const handleDeleteTemplate = (id) => {
    if (!window.confirm('Delete this template?')) return;
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  };

  const handleStartEdit = (t) => {
    setEditingId(t.id);
    setEditingTemplate({ title: t.title, body: t.body });
  };

  const handleSaveEdit = (id) => {
    if (!editingTemplate.title.trim() || !editingTemplate.body.trim()) { alert('Please fill in both title and message.'); return; }
    const updated = templates.map(t => t.id === id ? { ...t, title: editingTemplate.title.trim(), body: editingTemplate.body.trim() } : t);
    setTemplates(updated);
    saveTemplates(updated);
    setEditingId(null);
  };

  const StatCard = ({ icon, iconBg, iconColor, label, value, sub }) => (
    <div className="flex items-start gap-3">
      <div className={`p-3 rounded-xl ${iconBg}`}>{React.cloneElement(icon, { className: `w-6 h-6 ${iconColor}` })}</div>
      <div>
        <p className="text-app-tertiary text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className="text-app-primary font-bold text-2xl">
          {statsLoading ? <span className="inline-block w-8 h-7 bg-white/10 rounded animate-pulse" /> : value}
        </p>
        <p className="text-app-secondary text-xs mt-1">{sub}</p>
      </div>
    </div>
  );

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  };

  return (
    <div className="p-6 space-y-8">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Settings className="w-7 h-7 text-violet-400" />
            <h1 className="text-3xl font-bold text-app-primary">System Settings</h1>
          </div>
          <p className="text-app-secondary ml-10">Manage system preferences, account settings, and staff accounts.</p>
        </div>
        <button onClick={handleOpenStaffModal} className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm">
          <UserPlus size={16} /> Add Staff
        </button>
      </div>

      {/* ===== ACCOUNT INFORMATION ===== */}
      <div className="bg-card backdrop-blur-lg rounded-xl border">
        <div className="p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <h2 className="text-xl font-bold text-app-primary">Account Information</h2>
          <p className="text-app-secondary text-sm mt-1">Your admin account details and security settings.</p>
        </div>
        <div className="px-6 py-4 flex items-center gap-6 flex-wrap">
          <div className="p-2.5 rounded-xl bg-violet-500/20 shrink-0">
            <User className="w-5 h-5 text-violet-400" />
          </div>
          <div className="shrink-0">
            <p className="text-app-tertiary text-[10px] uppercase tracking-wider mb-0.5">Full Name</p>
            <p className="text-app-primary font-semibold text-sm">{user?.name || 'Admin User'}</p>
          </div>
          <div className="w-px h-8 bg-white/10 shrink-0" />
          <div className="shrink-0">
            <p className="text-app-tertiary text-[10px] uppercase tracking-wider mb-0.5">Email</p>
            <p className="text-app-primary font-semibold text-sm">{user?.email || 'admin@example.com'}</p>
          </div>
          <div className="w-px h-8 bg-white/10 shrink-0" />
          <div className="shrink-0">
            <p className="text-app-tertiary text-[10px] uppercase tracking-wider mb-0.5">Role</p>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-400">
              <Shield size={10} />
              {user?.role === 'admin' ? 'Administrator' : 'Staff'}
            </span>
          </div>
          <div className="w-px h-8 bg-white/10 shrink-0" />
          <div className="shrink-0">
            <p className="text-app-tertiary text-[10px] uppercase tracking-wider mb-0.5">Status</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>
          <div className="ml-auto shrink-0">
            <button onClick={handleOpenPasswordModal} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm">
              <Lock size={14} /> Change Password
            </button>
          </div>
        </div>
      </div>

      {/* ===== APPEARANCE SETTINGS ===== */}
      <div className="bg-card backdrop-blur-lg rounded-xl border">
        <div className="p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <h2 className="text-xl font-bold text-app-primary">Appearance</h2>
          <p className="text-app-secondary text-sm mt-1">Customize the visual appearance of the dashboard.</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark'
                ? <div className="p-2.5 rounded-lg bg-violet-500/20"><Moon className="w-5 h-5 text-violet-400" /></div>
                : <div className="p-2.5 rounded-lg bg-yellow-500/20"><Sun className="w-5 h-5 text-yellow-500" /></div>
              }
              <div>
                <p className="text-app-primary font-semibold">Theme Mode</p>
                <p className="text-app-secondary text-sm">{theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="relative inline-flex items-center h-8 w-16 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
              style={{ backgroundColor: theme === 'dark' ? '#7c3aed' : '#eab308' }}
            >
              <span className={`inline-block w-6 h-6 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-9' : 'translate-x-1'}`}>
                {theme === 'dark' ? <Moon className="w-4 h-4 text-violet-600 m-1" /> : <Sun className="w-4 h-4 text-yellow-600 m-1" />}
              </span>
            </button>
          </div>
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--table-header-bg)' }}>
            <p className="text-app-tertiary text-xs">
              💡 <strong>Tip:</strong> The theme preference is saved automatically and will persist across sessions.
              {theme === 'light' && ' Light mode is easier on the eyes in bright environments.'}
              {theme === 'dark' && ' Dark mode reduces eye strain in low-light conditions.'}
            </p>
          </div>
        </div>
      </div>

      {/* ===== NOTIFICATION PREFERENCES ===== */}
      <div className="bg-card backdrop-blur-lg rounded-xl border">
        <div className="p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <h2 className="text-xl font-bold text-app-primary">Notification Preferences</h2>
          <p className="text-app-secondary text-sm mt-1">Control when and how you receive notifications.</p>
        </div>
        <div className="p-6 space-y-4">
          {[
            { key: 'emailOnNewFeedback',  icon: <Mail />, iconBg: 'bg-blue-500/20',  iconColor: 'text-blue-400',  label: 'New Feedback Submitted', sub: 'Get notified when students submit new feedback' },
            { key: 'emailOnStatusChange', icon: <Bell />, iconBg: 'bg-green-500/20', iconColor: 'text-green-400', label: 'Status Updates',           sub: 'Get notified when feedback status changes' },
            { key: 'emailOnNewMessage',   icon: <Mail />, iconBg: 'bg-pink-500/20',  iconColor: 'text-pink-400',  label: 'New Messages',             sub: 'Get notified when students send messages' },
          ].map(({ key, icon, iconBg, iconColor, label, sub }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${iconBg}`}>{React.cloneElement(icon, { className: `w-5 h-5 ${iconColor}` })}</div>
                <div>
                  <p className="text-app-primary font-semibold">{label}</p>
                  <p className="text-app-secondary text-sm">{sub}</p>
                </div>
              </div>
              <button
                onClick={() => handleNotificationToggle(key)}
                className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors ${notificationSettings[key] ? 'bg-violet-500' : 'bg-gray-500'}`}
              >
                <span className={`inline-block w-6 h-6 transform rounded-full bg-white transition-transform ${notificationSettings[key] ? 'translate-x-9' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--table-header-bg)' }}>
            <p className="text-app-tertiary text-xs">ℹ️ <strong>Note:</strong> Notification preferences are saved locally in your browser.</p>
          </div>
        </div>
      </div>

      {/* ===== RESPONSE TEMPLATES ===== */}
      <div className="bg-card backdrop-blur-lg rounded-xl border">
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <h2 className="text-xl font-bold text-app-primary">Response Templates</h2>
            <p className="text-app-secondary text-sm mt-1">Pre-written replies you can use when responding to feedback.</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            <Plus size={14} /> Add Template
          </button>
        </div>

        <div className="p-6 space-y-3">

          {/* Add new template form */}
          {showAddForm && (
            <div className="rounded-xl p-4 space-y-3 border border-violet-500/30" style={{ backgroundColor: 'var(--table-header-bg)' }}>
              <p className="text-app-primary text-sm font-semibold">New Template</p>
              <input
                type="text"
                placeholder="Template title (e.g. Acknowledgement)"
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-input border text-app-primary placeholder-gray-500"
                value={newTemplate.title}
                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
              />
              <textarea
                placeholder="Write the template message..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-input border text-app-primary placeholder-gray-500 resize-none"
                value={newTemplate.body}
                onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
              />
              <div className="flex gap-2">
                <button onClick={handleAddTemplate} className="flex items-center gap-1.5 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm hover:opacity-90">
                  <Check size={13} /> Save
                </button>
                <button onClick={() => { setShowAddForm(false); setNewTemplate({ title: '', body: '' }); }} className="px-4 py-2 text-app-secondary text-sm rounded-lg hover:bg-white/10">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Templates list */}
          {templates.length === 0 ? (
            <div className="text-center py-10 text-app-secondary text-sm">No templates yet. Click "Add Template" to create one.</div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--table-header-bg)' }}>
                {editingId === t.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-input border text-app-primary"
                      value={editingTemplate.title}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                    />
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-input border text-app-primary resize-none"
                      value={editingTemplate.body}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(t.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs hover:opacity-90">
                        <Check size={12} /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-app-secondary text-xs rounded-lg hover:bg-white/10">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-violet-500/20 shrink-0 mt-0.5">
                        <FileText size={14} className="text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-app-primary text-sm font-semibold mb-1">{t.title}</p>
                        <p className="text-app-secondary text-xs leading-relaxed">{t.body}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleStartEdit(t)} className="p-1.5 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500 border border-blue-500/30 transition-all">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDeleteTemplate(t.id)} className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== SYSTEM INFORMATION ===== */}
      <div className="bg-card backdrop-blur-lg rounded-xl border">
        <div className="p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-app-primary">System Information</h2>
              <p className="text-app-secondary text-sm mt-1">Overview of system statistics and version information.</p>
            </div>
            <button
              onClick={fetchSystemStats}
              disabled={statsLoading}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-40"
            >
              <svg className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={<User />}     iconBg="bg-blue-500/20"   iconColor="text-blue-400"   label="Total Students"    value={systemStats.totalUsers}      sub="Active registered students" />
            <StatCard icon={<Mail />}     iconBg="bg-violet-500/20" iconColor="text-violet-400" label="Total Feedback"    value={systemStats.totalFeedback}   sub="All time submissions" />
            <StatCard icon={<Database />} iconBg="bg-green-500/20"  iconColor="text-green-400"  label="Active Categories" value={systemStats.totalCategories} sub="Currently active categories" />
          </div>
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gray-500/20"><Info className="w-5 h-5 text-gray-400" /></div>
              <div>
                <p className="text-app-tertiary text-xs uppercase tracking-wider mb-1">System Version</p>
                <p className="text-app-primary font-semibold">Student Feedback System v1.0.0</p>
                <p className="text-app-secondary text-xs mt-1">Last updated: March 2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CHANGE PASSWORD MODAL ===== */}
      {showPasswordModal && (
        <div className="bg-modal-overlay backdrop-blur-sm" style={overlayStyle}>
          <div className="bg-modal rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/20"><Lock className="w-5 h-5 text-violet-400" /></div>
                <h2 className="text-2xl font-bold text-app-primary">Change Password</h2>
              </div>
              <button onClick={handleClosePasswordModal} className="text-app-secondary hover:text-app-primary"><X size={24} /></button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-app-secondary mb-2">Current Password *</label>
                <input type="password" required placeholder="Enter your current password"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={passwordFormData.currentPassword}
                  onChange={(e) => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })} />
              </div>
              <div>
                <label className="block text-app-secondary mb-2">New Password *</label>
                <input type="password" required placeholder="Enter new password (min. 6 characters)"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={passwordFormData.newPassword}
                  onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })} />
              </div>
              <div>
                <label className="block text-app-secondary mb-2">Confirm New Password *</label>
                <input type="password" required placeholder="Re-enter new password"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={passwordFormData.confirmPassword}
                  onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })} />
              </div>
              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <p className="text-app-tertiary text-xs">🔒 Your password must be at least 6 characters long and different from your current password.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white px-6 py-2 rounded-lg hover:opacity-90">Change Password</button>
                <button type="button" onClick={handleClosePasswordModal} className="px-6 py-2 bg-card text-app-primary rounded-lg hover:bg-card-hover">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== STAFF CREATION MODAL ===== */}
      {showStaffModal && (
        <div className="bg-modal-overlay backdrop-blur-sm" style={overlayStyle}>
          <div className="bg-modal rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20"><UserPlus className="w-5 h-5 text-blue-400" /></div>
                <h2 className="text-2xl font-bold text-app-primary">Create Staff Account</h2>
              </div>
              <button onClick={handleCloseStaffModal} className="text-app-secondary hover:text-app-primary"><X size={24} /></button>
            </div>
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-app-secondary mb-2">Full Name *</label>
                <input type="text" required placeholder="e.g. John Doe"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={staffFormData.name}
                  onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-app-secondary mb-2">Email Address *</label>
                <input type="email" required placeholder="e.g. staff@schoolname.edu"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={staffFormData.email}
                  onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-app-secondary mb-2">Staff ID *</label>
                <input type="text" required placeholder="e.g. STAFF001"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={staffFormData.studentId}
                  onChange={(e) => setStaffFormData({ ...staffFormData, studentId: e.target.value })} />
              </div>
              <div>
                <label className="block text-app-secondary mb-2">Password *</label>
                <input type="password" required placeholder="Minimum 6 characters"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={staffFormData.password}
                  onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })} />
                <p className="text-app-tertiary text-xs mt-1">Password must be at least 6 characters long.</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-app-tertiary text-xs">ℹ️ This staff member will be able to view and manage feedback but will not have access to system settings or admin functions.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg hover:opacity-90">Create Staff Account</button>
                <button type="button" onClick={handleCloseStaffModal} className="px-6 py-2 bg-card text-app-primary rounded-lg hover:bg-card-hover">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;