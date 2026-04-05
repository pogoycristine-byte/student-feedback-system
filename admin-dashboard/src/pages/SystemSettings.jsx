import React, { useState, useEffect } from 'react';
import { Settings, Sun, Moon, UserPlus, X, Lock, User, Bell, Info, Mail, Database, Shield, FileText, Plus, Trash2, Pencil, Check, Copy, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api, { analyticsAPI, categoryAPI, userAPI } from '../services/api';

// ── Auto-generation helpers ──
const generateStaffId = () => {
  const digits = Math.floor(100000 + Math.random() * 900000).toString();
  return `STAFF-${digits}`;
};

const generateStrongPassword = () => {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '!@#$%&*';
  const all     = upper + lower + digits + special;
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = 0; i < 8; i++) pwd.push(all[Math.floor(Math.random() * all.length)]);
  return pwd.sort(() => Math.random() - 0.5).join('');
};

const SystemSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [showStaffModal,    setShowStaffModal]    = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [staffStep,         setStaffStep]         = useState(1);
  const [staffFormData,     setStaffFormData]     = useState({ name: '', email: '', password: '', studentId: '' });
  const [copiedField,       setCopiedField]       = useState(null); // 'id' | 'password'

  const [passwordFormData, setPasswordFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notificationSettings, setNotificationSettings] = useState({
    emailOnNewFeedback:  true,
    emailOnStatusChange: true,
    emailOnNewMessage:   true,
  });
  const [systemStats,  setSystemStats]  = useState({ totalUsers: '--', totalFeedback: '--', totalCategories: '--' });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
    const savedPrefs = localStorage.getItem('notificationSettings');
    if (savedPrefs) setNotificationSettings(JSON.parse(savedPrefs));
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
      const analytics  = analyticsRes.data.analytics;
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

  // ── Staff modal handlers ──
  const handleOpenStaffModal = () => {
    setStaffStep(1);
    setStaffFormData({ name: '', email: '', password: generateStrongPassword(), studentId: generateStaffId() });
    setShowStaffModal(true);
  };

  const handleCloseStaffModal = () => {
    setShowStaffModal(false);
    setStaffStep(1);
    setCopiedField(null);
    setStaffFormData({ name: '', email: '', password: '', studentId: '' });
  };

  const handleRegenerateCredentials = () => {
    setStaffFormData(prev => ({ ...prev, password: generateStrongPassword(), studentId: generateStaffId() }));
  };

  const handleStaffNext = (e) => {
    e.preventDefault();
    if (!staffFormData.name.trim()) { alert('Please enter the full name.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(staffFormData.email)) { alert('Please enter a valid email address.'); return; }
    setStaffStep(2);
  };

  const handleCopyToClipboard = (value, field) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name:      staffFormData.name.trim(),
      email:     staffFormData.email.trim().toLowerCase(),
      password:  staffFormData.password,
      studentId: staffFormData.studentId,
    };
    try {
      await api.post('/auth/create-staff', payload);
      alert(
        'Staff account created successfully!\n\n' +
        'Login Credentials:\n' +
        'Email: '    + payload.email    + '\n' +
        'Staff ID: ' + payload.studentId + '\n' +
        'Password: ' + payload.password
      );
      handleCloseStaffModal();
      fetchSystemStats();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.response?.data?.error || 'Failed to create staff account'));
    }
  };

  // ── Password modal handlers ──
  const handleOpenPasswordModal  = () => { setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' }); setShowPasswordModal(true); };
  const handleClosePasswordModal = () => { setShowPasswordModal(false); setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' }); };

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

  // ── Credential row (Staff ID / Password display) ──
  const CredentialRow = ({ label, value, field, mono = false }) => (
    <div className="rounded-lg border p-3 flex items-center justify-between gap-3" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--table-header-bg)' }}>
      <div className="min-w-0">
        <p className="text-app-tertiary text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-app-primary text-sm font-semibold truncate ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</p>
      </div>
      <button
        type="button"
        onClick={() => handleCopyToClipboard(value, field)}
        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all"
        style={{
          borderColor: copiedField === field ? 'rgb(34 197 94 / 0.4)' : 'var(--card-border)',
          color: copiedField === field ? 'rgb(74 222 128)' : 'var(--text-secondary)',
          backgroundColor: copiedField === field ? 'rgb(34 197 94 / 0.1)' : 'transparent',
        }}
      >
        {copiedField === field ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
      </button>
    </div>
  );

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
              {theme === 'dark'  && ' Dark mode reduces eye strain in low-light conditions.'}
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
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-app-primary"
                  value={passwordFormData.currentPassword}
                  onChange={(e) => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })} />
              </div>
              <div>
                <label className="block text-app-secondary mb-2">New Password *</label>
                <input type="password" required placeholder="Enter new password (min. 6 characters)"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-app-primary"
                  value={passwordFormData.newPassword}
                  onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })} />
              </div>
              <div>
                <label className="block text-app-secondary mb-2">Confirm New Password *</label>
                <input type="password" required placeholder="Re-enter new password"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-app-primary"
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

            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20"><UserPlus className="w-5 h-5 text-blue-400" /></div>
                <h2 className="text-2xl font-bold text-app-primary">Create Staff Account</h2>
              </div>
              <button onClick={handleCloseStaffModal} className="text-app-secondary hover:text-app-primary"><X size={24} /></button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2].map((s) => (
                <React.Fragment key={s}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${staffStep >= s ? 'bg-blue-500 text-white' : 'bg-white/10 text-app-tertiary'}`}>{s}</div>
                  {s < 2 && <div className={`h-0.5 flex-1 rounded transition-colors ${staffStep > 1 ? 'bg-blue-500' : 'bg-white/10'}`} />}
                </React.Fragment>
              ))}
              <span className="ml-2 text-xs text-app-tertiary whitespace-nowrap">
                {staffStep === 1 ? 'Basic Info' : 'Review Credentials'}
              </span>
            </div>

            {staffStep === 1 ? (
              /* ── Step 1: Name + Email ── */
              <form onSubmit={handleStaffNext} className="space-y-4">
                <div>
                  <label className="block text-app-secondary mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-app-primary"
                    value={staffFormData.name}
                    onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-app-secondary mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. staff@schoolname.edu"
                    className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-app-primary"
                    value={staffFormData.email}
                    onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                  />
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-app-tertiary text-xs">ℹ️ Staff ID and password will be auto-generated in the next step. You can copy and share them with the staff member.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg hover:opacity-90 font-semibold"
                  >
                    Next →
                  </button>
                  <button type="button" onClick={handleCloseStaffModal} className="px-6 py-2 bg-card text-app-primary rounded-lg hover:bg-card-hover">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* ── Step 2: Review auto-generated credentials ── */
              <form onSubmit={handleStaffSubmit} className="space-y-4">
                {/* Summary */}
                <div className="rounded-lg border p-3 flex items-center gap-3" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--table-header-bg)' }}>
                  <div className="p-2 rounded-lg bg-blue-500/20 shrink-0">
                    <User size={16} className="text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-app-primary text-sm font-semibold truncate">{staffFormData.name}</p>
                    <p className="text-app-secondary text-xs truncate">{staffFormData.email}</p>
                  </div>
                </div>

                <CredentialRow label="Staff ID"  value={staffFormData.studentId} field="id"       mono />
                <CredentialRow label="Password"  value={staffFormData.password}  field="password" mono />

                {/* Regenerate */}
                <button
                  type="button"
                  onClick={handleRegenerateCredentials}
                  className="flex items-center gap-2 text-xs text-app-tertiary hover:text-app-primary px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all"
                >
                  <RefreshCw size={11} /> Regenerate credentials
                </button>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-amber-400/80 text-xs">⚠️ Make sure to copy and securely share these credentials with the staff member before closing.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg hover:opacity-90 font-semibold"
                  >
                    Create Staff Account
                  </button>
                  <button type="button" onClick={() => setStaffStep(1)} className="px-6 py-2 bg-card text-app-primary rounded-lg hover:bg-card-hover">
                    ← Back
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SystemSettings;