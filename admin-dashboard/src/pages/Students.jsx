import React, { useState, useEffect, useRef } from 'react';
import { userAPI } from '../services/api';
import { Search, Eye, UserCheck, UserX, Trash2, X, Users, ChevronLeft, ChevronRight, ChevronDown, AlertTriangle, ClipboardList, CheckCheck } from 'lucide-react';
import { createPortal } from 'react-dom';

const TABS = ['Students', 'Staff', 'Admin'];

const TAB_ROLE_MAP = {
  Students: 'student',
  Staff: 'staff',
  Admin: 'admin',
};

const STATUS_MAP = {
  Pending:        { bar: 'from-yellow-500 to-orange-500', bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  'Under Review': { bar: 'from-blue-500 to-cyan-500',     bg: 'bg-blue-500/20',   text: 'text-blue-300' },
  Resolved:       { bar: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/20',text: 'text-emerald-300' },
  Rejected:       { bar: 'from-red-500 to-rose-500',      bg: 'bg-red-500/20',    text: 'text-red-300' },
};

const COLUMNS = {
  Students: ['Name', 'Student ID', 'Email', 'Year / Block', 'Status', 'Online', 'Actions'],
  Staff:    ['Name', 'Staff ID',   'Email', 'Last Login',   'Status', 'Online', 'Actions'],
  Admin:    ['Name', 'Email',      'Last Login',            'Status', 'Online', 'Actions'],
};

const DEACTIVATION_REASONS = [
  'Violation of school policy',
  'Academic misconduct',
  'Account security concern',
  'Graduated / No longer enrolled',
  'Duplicate account',
  'Administrative request',
  'Other',
];

const ITEMS_PER_PAGE = 10;

// ── Activity log helpers ──
const LOG_ICONS = {
  deactivate: { emoji: '🔴', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  activate:   { emoji: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  delete:     { emoji: '🗑️', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
};

const formatLogTime = (date) => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const isUserOnline = (user) => {
  const ts = user.lastSeen || user.lastLogin;
  if (!ts) return false;
  const diffSecs = Math.floor((new Date() - new Date(ts)) / 1000);
  return diffSecs < 60;
};

const formatLastLogin = (dateStr) => {
  if (!dateStr) return { label: 'Never', color: 'text-gray-600', dot: 'bg-gray-600', time: null };

  const date     = new Date(dateStr);
  const now      = new Date();
  const diffMins = Math.floor((now - date) / (1000 * 60));
  const diffHrs  = Math.floor((now - date) / (1000 * 60 * 60));
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  let label, color, dot;

  if (diffMins < 5) {
    label = 'Just now';        color = 'text-emerald-400'; dot = 'bg-emerald-400';
  } else if (diffMins < 60) {
    label = `${diffMins}m ago`; color = 'text-emerald-400'; dot = 'bg-emerald-400';
  } else if (diffHrs < 24) {
    label = `${diffHrs}h ago`;  color = 'text-blue-400';    dot = 'bg-blue-400';
  } else if (diffDays === 1) {
    label = 'Yesterday';        color = 'text-yellow-400';  dot = 'bg-yellow-400';
  } else if (diffDays < 7) {
    label = `${diffDays} days ago`; color = 'text-yellow-400'; dot = 'bg-yellow-400';
  } else {
    label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    color = 'text-gray-400'; dot = 'bg-gray-500';
  }

  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return { label, color, dot, time };
};

const Students = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Students');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [onlineFilter, setOnlineFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearLevelFilter, setYearLevelFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Deactivation remarks state ──
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [remarksTarget, setRemarksTarget] = useState(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [remarksLoading, setRemarksLoading] = useState(false);

  // ── Activity log state ──
  const [activityLog, setActivityLog] = useState([]);
  const [readLogIds, setReadLogIds] = useState(new Set());
  const [showActivityLog, setShowActivityLog] = useState(false);
  const activityLogRef = useRef(null);

  // ── Activity log detail modal state ──
  const [logDetailEntry, setLogDetailEntry] = useState(null);
  const [showLogDetailModal, setShowLogDetailModal] = useState(false);

  const addActivityLog = (type, userName, detail = '', userId = null, userRole = null) => {
    const entry = {
      id: Date.now() + Math.random(),
      type,         // 'activate' | 'deactivate' | 'delete'
      userName,
      detail,
      userId,
      userRole,
      time: new Date(),
    };
    setActivityLog(prev => [entry, ...prev].slice(0, 50)); // keep last 50
  };

  // ── Mark all as read ──
  const handleMarkAllAsRead = () => {
    setReadLogIds(new Set(activityLog.map(e => e.id)));
  };

  // ── Unread count ──
  const unreadCount = activityLog.filter(e => !readLogIds.has(e.id)).length;

  // ── Handle clicking a log entry ──
  const handleLogEntryClick = (entry) => {
    // Mark this entry as read
    setReadLogIds(prev => new Set([...prev, entry.id]));

    // If it's a deactivate entry with a reason, show the detail modal
    if (entry.type === 'deactivate' && entry.detail) {
      setLogDetailEntry(entry);
      setShowLogDetailModal(true);
      setShowActivityLog(false);
      return;
    }

    // For activate/delete, navigate to the tab matching the user's role
    if (entry.userRole) {
      const tabMap = { student: 'Students', staff: 'Staff', admin: 'Admin' };
      const targetTab = tabMap[entry.userRole];
      if (targetTab) {
        setActiveTab(targetTab);
        setShowActivityLog(false);
        // If activate, filter to show the user
        if (entry.type === 'activate' && entry.userName) {
          setSearchTerm(entry.userName);
        }
      }
    }
  };

  // ── Close log panel when clicking outside ──
  useEffect(() => {
    if (!showActivityLog) return;
    const handleClickOutside = (e) => {
      if (activityLogRef.current && !activityLogRef.current.contains(e.target)) {
        setShowActivityLog(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActivityLog]);

  const pollRef = useRef(null);

  const [isLightMode, setIsLightMode] = useState(
    () => document.documentElement.classList.contains('light-mode') || document.body.classList.contains('light-mode')
  );
  useEffect(() => {
    const check = () => setIsLightMode(
      document.documentElement.classList.contains('light-mode') || document.body.classList.contains('light-mode')
    );
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchAllUsers();

    pollRef.current = setInterval(() => {
      fetchAllUsers(true);
    }, 10 * 1000);

    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    setSearchTerm('');
    setOnlineFilter('all');
    setStatusFilter('all');
    setYearLevelFilter('all');
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, onlineFilter, statusFilter, yearLevelFilter]);

  const fetchAllUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [studentsRes, staffRes, adminRes] = await Promise.all([
        userAPI.getAll({ role: 'student' }),
        userAPI.getAll({ role: 'staff' }),
        userAPI.getAll({ role: 'admin' }),
      ]);
      const students = (studentsRes.data.users || []).map(u => ({ ...u, role: 'student' }));
      const staff    = (staffRes.data.users   || []).map(u => ({ ...u, role: 'staff' }));
      const admins   = (adminRes.data.users   || []).map(u => ({ ...u, role: 'admin' }));
      setAllUsers([...students, ...staff, ...admins]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleViewDetails = async (user) => {
    try {
      const response = await userAPI.getById(user._id);
      setSelectedUser(response.data);
      setShowModal(true);
    } catch (error) {
      alert('Failed to load user details');
    }
  };

  // ── Opens remarks modal if deactivating; toggles directly if activating ──
  const handleToggleStatus = (user) => {
    if (user.isActive) {
      setRemarksTarget(user);
      setSelectedReason('');
      setCustomReason('');
      setShowRemarksModal(true);
    } else {
      confirmToggleStatus(user._id, null, user.name, user.role);
    }
  };

  const confirmToggleStatus = async (id, remarks, userName, userRole) => {
    // Determine whether we're activating or deactivating based on remarks presence
    const isDeactivating = !!remarks;
    setRemarksLoading(true);
    try {
      await userAPI.toggleStatus(id, remarks ? { remarks } : undefined);
      // Log the action — pass userId and userRole for navigation
      addActivityLog(
        isDeactivating ? 'deactivate' : 'activate',
        userName || remarksTarget?.name || 'Unknown user',
        isDeactivating ? remarks : '',
        id,
        userRole || remarksTarget?.role || null
      );
      fetchAllUsers();
      alert('User status updated!');
    } catch (error) {
      alert('Failed to update user status');
    } finally {
      setRemarksLoading(false);
      setShowRemarksModal(false);
      setRemarksTarget(null);
    }
  };

  const handleRemarksConfirm = () => {
    const reason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!reason) {
      alert('Please select or enter a reason for deactivation.');
      return;
    }
    confirmToggleStatus(remarksTarget._id, reason, remarksTarget.name, remarksTarget.role);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      // Find user name before deleting
      const user = allUsers.find(u => u._id === id);
      try {
        await userAPI.delete(id);
        addActivityLog('delete', user?.name || 'Unknown user', `Role: ${user?.role || 'unknown'}`, id, user?.role || null);
        fetchAllUsers();
        alert('User deleted successfully!');
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const usersForTab = allUsers.filter(u => u.role === TAB_ROLE_MAP[activeTab]);

  const yearLevelOptions = [
    ...new Set(
      allUsers
        .filter(u => u.role === 'student' && u.yearLevel)
        .map(u => u.yearLevel)
    ),
  ].sort();

  const filteredUsers = usersForTab.filter(u => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const online = isUserOnline(u);
    const matchesOnline =
      onlineFilter === 'all' ? true :
      onlineFilter === 'online' ? online :
      !online;

    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? u.isActive :
      !u.isActive;

    const matchesYearLevel =
      activeTab !== 'Students' || yearLevelFilter === 'all'
        ? true
        : u.yearLevel === yearLevelFilter;

    return matchesSearch && matchesOnline && matchesStatus && matchesYearLevel;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const activeCount   = usersForTab.filter(u => u.isActive).length;
  const inactiveCount = usersForTab.length - activeCount;
  const onlineCount   = usersForTab.filter(u => isUserOnline(u)).length;

  const tabCounts = {
    Students: allUsers.filter(u => u.role === 'student').length,
    Staff:    allUsers.filter(u => u.role === 'staff').length,
    Admin:    allUsers.filter(u => u.role === 'admin').length,
  };

  const getSelectStyle = (isFiltered) => isLightMode
    ? {
        background: isFiltered
          ? 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(219,39,119,0.15))'
          : 'rgba(255,255,255,0.85)',
        borderColor: isFiltered ? 'rgba(124,58,237,0.5)' : 'rgba(196,181,253,0.5)',
        color: '#111827',
        colorScheme: 'light',
      }
    : {
        background: isFiltered
          ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(219,39,119,0.25))'
          : 'rgba(255,255,255,0.06)',
        borderColor: isFiltered ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)',
        color: isFiltered ? '#e2d9fc' : '#9ca3af',
      };

  const getOptionStyle = isLightMode
    ? { background: '#ffffff', color: '#111827' }
    : { background: '#1a1025', color: '#e5e7eb' };

  const anyFilterActive = onlineFilter !== 'all' || statusFilter !== 'all' || yearLevelFilter !== 'all';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-gray-400 text-sm">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 pt-0 space-y-5" style={{ marginTop: '1px' }}>
      <style>{`.users-search-input::placeholder { color: #1e1b4b !important; opacity: 0.5 !important; }`}</style>

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage all users — students, staff, and admins.</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
          <div className="flex items-center gap-2 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-300 font-semibold">{activeCount}</span>
            <span className="text-gray-500">active</span>
          </div>
          <div className="flex items-center gap-2 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-red-300 font-semibold">{inactiveCount}</span>
            <span className="text-gray-500">inactive</span>
          </div>
          <div className="flex items-center gap-2 text-sm bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-300 font-semibold">{onlineCount}</span>
            <span className="text-gray-500">online</span>
          </div>

          {/* ── Activity Log Button ── */}
          <div className="relative" ref={activityLogRef}>
            <button
              onClick={() => setShowActivityLog(v => !v)}
              title="Activity Log"
              className="relative flex items-center gap-2 text-sm border rounded-xl px-4 py-2.5 transition-all hover:bg-white/10"
              style={{
                background: showActivityLog
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(219,39,119,0.25))'
                  : 'rgba(255,255,255,0.06)',
                borderColor: showActivityLog ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)',
                color: showActivityLog ? '#e2d9fc' : '#9ca3af',
              }}
            >
              <ClipboardList className="w-4 h-4" />
              <span className="font-medium">Activity</span>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* ── Activity Log Dropdown Panel ── */}
            {showActivityLog && (
              <div
                className="absolute right-0 top-full mt-2 w-96 rounded-2xl overflow-hidden z-40"
                style={{
                  background: isLightMode ? 'rgba(245,243,255,0.97)' : 'linear-gradient(145deg, #1a1025, #0f0a1a)',
                  border: isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: isLightMode
                    ? '0 20px 50px rgba(109,40,217,0.15)'
                    : '0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(109,40,217,0.2)',
                }}
              >
                {/* Panel header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: isLightMode ? '1px solid rgba(196,181,253,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" style={{ color: isLightMode ? '#7c3aed' : '#a78bfa' }} />
                    <span className="text-sm font-bold" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>
                      Activity Log
                    </span>
                    {activityLog.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-violet-500/20 text-violet-300">
                        {activityLog.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* ── Mark all as read button ── */}
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="flex items-center gap-1 text-xs transition-colors hover:text-violet-400"
                        style={{ color: isLightMode ? '#7c3aed' : '#a78bfa' }}
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowActivityLog(false)}
                      className="p-1 rounded-lg hover:bg-white/10 transition-all"
                      style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Log entries */}
                <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
                  {activityLog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{
                          background: isLightMode ? 'rgba(109,40,217,0.08)' : 'rgba(255,255,255,0.05)',
                          border: isLightMode ? '1px solid rgba(196,181,253,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <ClipboardList className="w-5 h-5" style={{ color: isLightMode ? '#a78bfa' : '#6b7280' }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: isLightMode ? '#6b7280' : '#6b7280' }}>No activity yet</p>
                      <p className="text-xs text-center px-6" style={{ color: isLightMode ? '#9ca3af' : '#4b5563' }}>
                        Actions like activating, deactivating, or deleting accounts will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {activityLog.map((entry) => {
                        const icon = LOG_ICONS[entry.type];
                        const isRead = readLogIds.has(entry.id);
                        const actionLabel =
                          entry.type === 'deactivate' ? 'Deactivated' :
                          entry.type === 'activate'   ? 'Activated' :
                                                        'Deleted';

                        // Determine if this entry is clickable and what hint to show
                        const isClickable =
                          (entry.type === 'deactivate' && !!entry.detail) ||
                          (entry.type === 'activate' && !!entry.userRole) ||
                          (entry.type === 'delete' && !!entry.userRole);

                        const clickHint =
                          entry.type === 'deactivate' ? 'Click to view deactivation reason' :
                          entry.type === 'activate'   ? 'Click to view in user list' :
                          entry.type === 'delete'     ? 'Click to go to user list' : '';

                        return (
                          <div
                            key={entry.id}
                            onClick={() => handleLogEntryClick(entry)}
                            className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                            style={{
                              background: isRead
                                ? isLightMode ? 'rgba(109,40,217,0.02)' : 'rgba(255,255,255,0.015)'
                                : isLightMode ? 'rgba(109,40,217,0.07)' : 'rgba(255,255,255,0.05)',
                              border: isRead
                                ? isLightMode ? '1px solid rgba(196,181,253,0.12)' : '1px solid rgba(255,255,255,0.04)'
                                : isLightMode ? '1px solid rgba(124,58,237,0.25)' : '1px solid rgba(124,58,237,0.2)',
                              opacity: isRead ? 0.65 : 1,
                            }}
                            title={isClickable ? clickHint : undefined}
                          >
                            {/* Icon badge */}
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm border ${icon.bg}`}
                            >
                              {entry.type === 'deactivate' && <UserX className={`w-3.5 h-3.5 ${icon.color}`} />}
                              {entry.type === 'activate'   && <UserCheck className={`w-3.5 h-3.5 ${icon.color}`} />}
                              {entry.type === 'delete'     && <Trash2 className={`w-3.5 h-3.5 ${icon.color}`} />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-xs font-semibold truncate" style={{ color: isLightMode ? '#1e1b4b' : '#e5e7eb' }}>
                                  <span className={`${icon.color} mr-1`}>{actionLabel}</span>
                                  {entry.userName}
                                </p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Unread dot */}
                                  {!isRead && (
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
                                    />
                                  )}
                                  <span className="text-[10px] font-mono" style={{ color: isLightMode ? '#9ca3af' : '#4b5563' }}>
                                    {formatLogTime(entry.time)}
                                  </span>
                                </div>
                              </div>
                              {entry.detail && (
                                <p className="text-[10px] mt-0.5 truncate" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>
                                  {entry.type === 'deactivate' ? `Reason: ${entry.detail}` : entry.detail}
                                </p>
                              )}
                              {isClickable && (
                                <p
                                  className="text-[10px] mt-0.5 font-medium"
                                  style={{ color: isLightMode ? '#7c3aed' : '#a78bfa' }}
                                >
                                  {clickHint} →
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Panel footer */}
                {activityLog.length > 0 && (
                  <div
                    className="px-4 py-2.5 text-center"
                    style={{ borderTop: isLightMode ? '1px solid rgba(196,181,253,0.2)' : '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <p className="text-[10px]" style={{ color: isLightMode ? '#9ca3af' : '#4b5563' }}>
                      Session only · resets on page refresh
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* ── End Activity Log ── */}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white border-transparent shadow-lg shadow-violet-500/20'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{tab}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-500'
              }`}>
                {tabCounts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: '#1e1b4b' }} />
        <input
          type="text"
          placeholder={`Search ${activeTab.toLowerCase()} by name, ID, or email...`}
          className="w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all users-search-input"
          style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(196,181,253,0.5)', color: '#1e1b4b' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: '#6b7280' }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            style={getSelectStyle(onlineFilter !== 'all')}
          >
            <option value="all"     style={getOptionStyle}>👥 Presence: All</option>
            <option value="online"  style={getOptionStyle}>🟢 Online</option>
            <option value="offline" style={getOptionStyle}>⚫ Offline</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            style={getSelectStyle(statusFilter !== 'all')}
          >
            <option value="all"      style={getOptionStyle}>🔘 Account: All</option>
            <option value="active"   style={getOptionStyle}>🟢 Active</option>
            <option value="inactive" style={getOptionStyle}>🔴 Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        </div>

        {activeTab === 'Students' && (
          <div className="relative">
            <select
              value={yearLevelFilter}
              onChange={(e) => setYearLevelFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              style={getSelectStyle(yearLevelFilter !== 'all')}
            >
              <option value="all" style={getOptionStyle}>🎓 Year Level: All</option>
              {yearLevelOptions.map(yl => (
                <option key={yl} value={yl} style={getOptionStyle}>{yl}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          </div>
        )}

        {anyFilterActive && (
          <button
            onClick={() => { setOnlineFilter('all'); setStatusFilter('all'); setYearLevelFilter('all'); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors px-2 py-2"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* ── Results count ── */}
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-xs">
          Showing{' '}
          <span className="text-white font-semibold">
            {filteredUsers.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredUsers.length)}
          </span>
          {' '}of{' '}
          <span className="text-white font-semibold">{filteredUsers.length}</span> {activeTab.toLowerCase()}
        </p>
        {totalPages > 1 && (
          <p className="text-gray-600 text-xs">Page {safeCurrentPage} of {totalPages}</p>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '2px solid rgba(0,0,0,0.3)' }}>
              {COLUMNS[activeTab].map(h => (
                <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS[activeTab].length} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-medium">No {activeTab.toLowerCase()} found</p>
                    <p className="text-gray-600 text-sm">Try a different search term or filter</p>
                  </div>
                </td>
              </tr>
            ) : paginatedUsers.map((user) => {
              const login  = formatLastLogin(user.lastLogin);
              const online = isUserOnline(user);
              return (
                <tr key={user._id} className="group hover:bg-white/[0.04] transition-all" style={{ borderBottom: '1px solid rgba(0,0,0,0.25)' }}>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} title={online ? 'Online' : 'Offline'} />
                      <p className="text-white text-sm font-semibold">{user.name}</p>
                    </div>
                  </td>

                  {(activeTab === 'Students' || activeTab === 'Staff') && (
                    <td className="px-6 py-4">
                      <span className="text-gray-300 text-sm font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        {user.studentId || '—'}
                      </span>
                    </td>
                  )}

                  <td className="px-6 py-4">
                    <span className="text-gray-400 text-sm">{user.email}</span>
                  </td>

                  {activeTab === 'Students' && (
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-sm">{user.yearLevel} — {user.section}</span>
                    </td>
                  )}

                  {(activeTab === 'Staff' || activeTab === 'Admin') && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${login.dot}`} />
                        <div>
                          <p className={`text-sm font-semibold ${login.color}`}>{login.label}</p>
                          {login.time && user.lastLogin && (
                            <p className="text-gray-600 text-xs mt-0.5">{login.time}</p>
                          )}
                        </div>
                      </div>
                    </td>
                  )}

                  <td className="px-6 py-4">
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        user.isActive
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-red-500/15 text-red-300 border-red-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {!user.isActive && user.deactivationRemark && (
                        <p className="text-[10px] text-orange-400/80 mt-1 max-w-[160px] truncate" title={user.deactivationRemark}>
                          ↳ {user.deactivationRemark}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      online
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : 'bg-gray-500/15 text-gray-400 border-gray-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}`} />
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      <button onClick={() => handleViewDetails(user)} title="View Details"
                        className="p-2 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500 border border-blue-500/30 hover:border-blue-500 transition-all">
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-2 rounded-lg border transition-all ${
                          user.isActive
                            ? 'text-orange-400 hover:text-white hover:bg-orange-500 border-orange-500/30 hover:border-orange-500'
                            : 'text-emerald-400 hover:text-white hover:bg-emerald-500 border-emerald-500/30 hover:border-emerald-500'
                        }`}
                      >
                        {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                      <button onClick={() => handleDelete(user._id)} title="Delete"
                        className="p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 hover:border-red-500 transition-all">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Controls ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-gray-500 text-xs">
            {filteredUsers.length} total · {ITEMS_PER_PAGE} per page
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>

            {getPageNumbers().map((page, idx) =>
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-2 text-gray-600 text-sm select-none">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-all ${
                    safeCurrentPage === page
                      ? 'text-white border-transparent'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                  style={safeCurrentPage === page ? { background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 2px 12px rgba(124,58,237,0.4)' } : {}}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {mounted && showModal && selectedUser && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: isLightMode ? 'rgba(245,243,255,0.97)' : 'linear-gradient(145deg, #1a1025, #0f0a1a)',
              border: isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,255,255,0.12)',
              boxShadow: isLightMode ? '0 25px 60px rgba(109,40,217,0.15)' : '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(109,40,217,0.2)',
            }}
          >
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: isLightMode ? '1px solid rgba(196,181,253,0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>{selectedUser.user?.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs font-mono" style={{ color: isLightMode ? '#6b7280' : '#6b7280' }}>{selectedUser.user?.studentId || selectedUser.user?.email}</p>
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full capitalize">
                    {selectedUser.user?.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition-all"
                style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Full Name', value: selectedUser.user?.name },
                  { label: 'Role',      value: selectedUser.user?.role },
                  { label: 'Email',     value: selectedUser.user?.email },
                  { label: 'Phone',     value: selectedUser.user?.phoneNumber },
                  ...(selectedUser.user?.role === 'student' ? [
                    { label: 'Student ID', value: selectedUser.user?.studentId },
                    { label: 'Year Level', value: selectedUser.user?.yearLevel },
                    { label: 'Block',      value: selectedUser.user?.section },
                  ] : []),
                  ...(selectedUser.user?.role === 'staff' ? [
                    { label: 'Staff ID',   value: selectedUser.user?.studentId },
                    { label: 'Last Login', value: selectedUser.user?.lastLogin
                        ? new Date(selectedUser.user.lastLogin).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Never logged in' },
                  ] : []),
                  ...(selectedUser.user?.role === 'admin' ? [
                    { label: 'Last Login', value: selectedUser.user?.lastLogin
                        ? new Date(selectedUser.user.lastLogin).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Never logged in' },
                  ] : []),
                  ...(!selectedUser.user?.isActive && selectedUser.user?.deactivationRemark ? [
                    { label: 'Deactivation Reason', value: selectedUser.user?.deactivationRemark },
                  ] : []),
                ].map((f, i) => (
                  <div
                    key={i}
                    className="rounded-xl px-4 py-3"
                    style={{
                      background: isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.04)',
                      border: isLightMode ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>{f.label}</p>
                    <p className="text-sm font-medium capitalize" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>{f.value || '—'}</p>
                  </div>
                ))}
              </div>

              {selectedUser.feedbackStats && selectedUser.feedbackStats.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widests font-semibold mb-3" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>Feedback Statistics</p>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedUser.feedbackStats.map((stat) => {
                      const s = STATUS_MAP[stat._id] || { bar: 'from-gray-500 to-gray-600', bg: 'bg-gray-500/20', text: 'text-gray-300' };
                      return (
                        <div
                          key={stat._id}
                          className="rounded-xl p-3 text-center"
                          style={{
                            background: isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.04)',
                            border: isLightMode ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          <div className={`h-1 rounded-full bg-gradient-to-r ${s.bar} mb-3 mx-auto w-8`} />
                          <p className="text-2xl font-bold" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>{stat.count}</p>
                          <p className={`text-xs font-medium mt-1 ${s.text}`}>{stat._id}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-xl font-medium text-sm transition-all hover:opacity-80"
                style={{
                  background: isLightMode ? 'rgba(237,233,254,0.7)' : 'rgba(255,255,255,0.06)',
                  border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.12)',
                  color: isLightMode ? '#4c1d95' : '#d1d5db',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Deactivation Remarks Modal ── */}
      {mounted && showRemarksModal && remarksTarget && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl w-full max-w-md"
            style={{
              background: isLightMode ? 'rgba(245,243,255,0.97)' : 'linear-gradient(145deg, #1a1025, #0f0a1a)',
              border: isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,165,0,0.2)',
              boxShadow: isLightMode ? '0 25px 60px rgba(109,40,217,0.15)' : '0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,146,60,0.15)',
            }}
          >
            <div
              className="flex items-center gap-3 px-6 py-5"
              style={{ borderBottom: isLightMode ? '1px solid rgba(196,181,253,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>
                  Deactivate Account
                </h2>
                <p className="text-xs mt-0.5 truncate" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>
                  {remarksTarget.name} · {remarksTarget.email}
                </p>
              </div>
              <button
                onClick={() => setShowRemarksModal(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition-all shrink-0"
                style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm" style={{ color: isLightMode ? '#4b5563' : '#9ca3af' }}>
                Please select a reason for deactivating this account. This will be recorded for audit purposes.
              </p>

              <div className="space-y-2">
                {DEACTIVATION_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: selectedReason === reason
                        ? isLightMode ? 'rgba(251,146,60,0.12)' : 'rgba(251,146,60,0.1)'
                        : isLightMode ? 'rgba(109,40,217,0.05)' : 'rgba(255,255,255,0.03)',
                      border: selectedReason === reason
                        ? '1px solid rgba(251,146,60,0.4)'
                        : isLightMode ? '1px solid rgba(196,181,253,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <input
                      type="radio"
                      name="deactivation-reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => { setSelectedReason(reason); setCustomReason(''); }}
                      className="accent-orange-400 shrink-0"
                    />
                    <span className="text-sm font-medium" style={{ color: isLightMode ? '#1e1b4b' : selectedReason === reason ? '#fed7aa' : '#d1d5db' }}>
                      {reason}
                    </span>
                  </label>
                ))}
              </div>

              {selectedReason === 'Other' && (
                <div>
                  <textarea
                    rows={3}
                    placeholder="Describe the reason for deactivation..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                    style={{
                      background: isLightMode ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.05)',
                      border: isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: isLightMode ? '#1e1b4b' : '#e5e7eb',
                    }}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowRemarksModal(false)}
                  disabled={remarksLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-40"
                  style={{
                    background: isLightMode ? 'rgba(237,233,254,0.7)' : 'rgba(255,255,255,0.06)',
                    border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    color: isLightMode ? '#4c1d95' : '#9ca3af',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemarksConfirm}
                  disabled={remarksLoading || !selectedReason || (selectedReason === 'Other' && !customReason.trim())}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ef4444)',
                    boxShadow: remarksLoading ? 'none' : '0 4px 14px rgba(249,115,22,0.3)',
                  }}
                >
                  {remarksLoading ? 'Deactivating...' : 'Confirm Deactivation'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Log Detail Modal (Deactivation Reason) ── */}
      {mounted && showLogDetailModal && logDetailEntry && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl w-full max-w-sm"
            style={{
              background: isLightMode ? 'rgba(245,243,255,0.97)' : 'linear-gradient(145deg, #1a1025, #0f0a1a)',
              border: isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,165,0,0.2)',
              boxShadow: isLightMode ? '0 25px 60px rgba(109,40,217,0.15)' : '0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,146,60,0.15)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-6 py-5"
              style={{ borderBottom: isLightMode ? '1px solid rgba(196,181,253,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                <UserX className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>
                  Deactivation Details
                </h2>
                <p className="text-xs mt-0.5" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>
                  Activity log entry
                </p>
              </div>
              <button
                onClick={() => { setShowLogDetailModal(false); setLogDetailEntry(null); }}
                className="p-2 rounded-xl hover:bg-white/10 transition-all shrink-0"
                style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* User info */}
              <div
                className="rounded-xl px-4 py-3"
                style={{
                  background: isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.04)',
                  border: isLightMode ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>
                  Account
                </p>
                <p className="text-sm font-semibold" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>
                  {logDetailEntry.userName}
                </p>
                {logDetailEntry.userRole && (
                  <span
                    className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize bg-violet-500/20 text-violet-300"
                  >
                    {logDetailEntry.userRole}
                  </span>
                )}
              </div>

              {/* Deactivation reason */}
              <div
                className="rounded-xl px-4 py-3"
                style={{
                  background: isLightMode ? 'rgba(251,146,60,0.08)' : 'rgba(251,146,60,0.08)',
                  border: isLightMode ? '1.5px solid rgba(251,146,60,0.3)' : '1px solid rgba(251,146,60,0.2)',
                }}
              >
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#92400e' : '#fb923c' }}>
                  Deactivation Reason
                </p>
                <p className="text-sm font-medium" style={{ color: isLightMode ? '#1e1b4b' : '#fed7aa' }}>
                  {logDetailEntry.detail}
                </p>
              </div>

              {/* Timestamp */}
              <div
                className="rounded-xl px-4 py-3"
                style={{
                  background: isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.04)',
                  border: isLightMode ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>
                  Logged At
                </p>
                <p className="text-sm font-medium" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>
                  {logDetailEntry.time.toLocaleString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </p>
              </div>

              <button
                onClick={() => { setShowLogDetailModal(false); setLogDetailEntry(null); }}
                className="w-full py-3 rounded-xl font-medium text-sm transition-all hover:opacity-80"
                style={{
                  background: isLightMode ? 'rgba(237,233,254,0.7)' : 'rgba(255,255,255,0.06)',
                  border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.12)',
                  color: isLightMode ? '#4c1d95' : '#d1d5db',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Students;