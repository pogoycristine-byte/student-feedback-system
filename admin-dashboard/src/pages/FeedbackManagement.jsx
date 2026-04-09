import React, { useState, useEffect } from 'react';
import { feedbackAPI, categoryAPI } from '../services/api';
import { Search, Eye, Trash2, MessageSquare, Calendar, Filter, X, ChevronDown, Star, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createPortal } from 'react-dom';

const DISMISSED_KEY = 'dismissedNewFeedback';
const getDismissedKey = (userId) => `${DISMISSED_KEY}_${userId}`;
const getDismissed = (userId) => {
  try { return new Set(JSON.parse(localStorage.getItem(getDismissedKey(userId)) || '[]')); }
  catch { return new Set(); }
};
const addDismissed = (id, userId) => {
  const set = getDismissed(userId);
  set.add(id);
  localStorage.setItem(getDismissedKey(userId), JSON.stringify([...set]));
};

const LAST_READ_KEY = 'adminLastReadMsgId';
const getLastRead = () => {
  try { return JSON.parse(localStorage.getItem(LAST_READ_KEY) || '{}'); }
  catch { return {}; }
};
const markChatRead = (feedbackId, lastMessageId) => {
  const map = getLastRead();
  map[feedbackId] = lastMessageId;
  localStorage.setItem(LAST_READ_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event('adminReadChat'));
};

const TEMPLATES_KEY = 'responseTemplates';
const getTemplates = () => {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); }
  catch { return []; }
};

const getDueStatus = (item) => {
  if (item.status === 'Resolved' || item.status === 'Rejected') return null;
  const due = new Date(item.createdAt);
  due.setDate(due.getDate() + 5);
  const now = new Date();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  if (now > due) return 'overdue';
  if (diffDays <= 1) return 'due-today';
  if (diffDays <= 2) return 'due-soon';
  return null;
};

const DUE_BADGE = {
  'overdue':   { label: '⚠ Overdue',   cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  'due-today': { label: '⏰ Due Today', cls: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
  'due-soon':  { label: '🕐 Due Soon',  cls: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
};

const STATUS_STYLES = {
  Pending:        { pill: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40', dot: 'bg-yellow-400' },
  'Under Review': { pill: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',       dot: 'bg-blue-400'   },
  Resolved:       { pill: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40', dot: 'bg-emerald-400' },
  Rejected:       { pill: 'bg-red-500/20 text-red-300 border border-red-500/40',           dot: 'bg-red-400'    },
};

const STATUS_TABS = ['All', 'Pending', 'Under Review', 'Resolved', 'Rejected'];

const STATUS_DROPDOWN_COLORS = {
  All: {
    dot: '#9ca3af',
    active: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', border: '#6b7280', badge: 'rgba(107,114,128,0.25)' },
    activeLight: { bg: 'rgba(107,114,128,0.1)', color: '#374151', border: '#6b7280', badge: 'rgba(107,114,128,0.15)' },
  },
  Pending: {
    dot: '#fbbf24',
    active: { bg: 'rgba(234,179,8,0.15)', color: '#fbbf24', border: '#d97706', badge: 'rgba(234,179,8,0.25)' },
    activeLight: { bg: 'rgba(217,119,6,0.1)', color: '#92400e', border: '#d97706', badge: 'rgba(217,119,6,0.15)' },
  },
  'Under Review': {
    dot: '#60a5fa',
    active: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '#2563eb', badge: 'rgba(59,130,246,0.25)' },
    activeLight: { bg: 'rgba(37,99,235,0.1)', color: '#1d4ed8', border: '#2563eb', badge: 'rgba(37,99,235,0.15)' },
  },
  Resolved: {
    dot: '#34d399',
    active: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: '#059669', badge: 'rgba(16,185,129,0.25)' },
    activeLight: { bg: 'rgba(5,150,105,0.1)', color: '#065f46', border: '#059669', badge: 'rgba(5,150,105,0.15)' },
  },
  Rejected: {
    dot: '#f87171',
    active: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: '#dc2626', badge: 'rgba(239,68,68,0.25)' },
    activeLight: { bg: 'rgba(220,38,38,0.1)', color: '#991b1b', border: '#dc2626', badge: 'rgba(220,38,38,0.15)' },
  },
};

const STATUS_BUTTON_COLORS_DARK = {
  All:            { bg: 'rgba(107,114,128,0.2)', border: 'rgba(107,114,128,0.4)', color: '#9ca3af' },
  Pending:        { bg: 'rgba(234,179,8,0.2)',   border: 'rgba(234,179,8,0.4)',   color: '#fbbf24' },
  'Under Review': { bg: 'rgba(59,130,246,0.2)',  border: 'rgba(59,130,246,0.4)',  color: '#60a5fa' },
  Resolved:       { bg: 'rgba(16,185,129,0.2)',  border: 'rgba(16,185,129,0.4)',  color: '#34d399' },
  Rejected:       { bg: 'rgba(239,68,68,0.2)',   border: 'rgba(239,68,68,0.4)',   color: '#f87171' },
};

const STATUS_BUTTON_COLORS_LIGHT = {
  All:            { bg: '#6b7280', border: '#4b5563', color: '#ffffff' },
  Pending:        { bg: '#d97706', border: '#b45309', color: '#ffffff' },
  'Under Review': { bg: '#2563eb', border: '#1d4ed8', color: '#ffffff' },
  Resolved:       { bg: '#059669', border: '#047857', color: '#ffffff' },
  Rejected:       { bg: '#dc2626', border: '#b91c1c', color: '#ffffff' },
};

const resolveChangedBy = (changedBy) => {
  if (!changedBy) return { name: 'Unknown', role: 'admin' };
  if (typeof changedBy === 'object') {
    return {
      name: changedBy.name || changedBy.username || changedBy.email || 'Unknown',
      role: changedBy.role || 'admin',
    };
  }
  return { name: 'Unknown', role: 'admin' };
};

const getCategoryLabel = (item) => {
  const baseName = item.category?.name || '';
  const isOthers = baseName.toLowerCase().trim() === 'others' || baseName.toLowerCase().trim() === 'other';
  if (isOthers && item.otherSpecification) {
    return `${item.category?.icon || ''} ${baseName}: ${item.otherSpecification}`;
  }
  return `${item.category?.icon || ''} ${baseName}`;
};

// ── Student Avatar helper ──
const StudentAvatar = ({ src, name, size = 34 }) => {
  const [imgError, setImgError] = useState(false);
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const colors = [
    ['#7c3aed', '#4c1d95'], ['#db2777', '#831843'], ['#0369a1', '#0c4a6e'],
    ['#059669', '#064e3b'], ['#d97706', '#78350f'], ['#dc2626', '#7f1d1d'],
  ];
  const colorPair = colors[(name?.charCodeAt(0) || 0) % colors.length];

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        style={{
          width: size, height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid rgba(139,92,246,0.4)',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
      border: '2px solid rgba(139,92,246,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontSize: size * 0.35, fontWeight: 700, color: '#fff',
      letterSpacing: '0.5px',
    }}>
      {initials}
    </div>
  );
};

const FeedbackManagement = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [categories, setCategories] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [dismissedNew, setDismissedNew] = useState(() => getDismissed());
  const [unreadChats, setUnreadChats] = useState(new Map());
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [mounted, setMounted] = useState(false); // ← added

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // ← added
  useEffect(() => {
    setMounted(true);
  }, []);

  // Re-initialize dismissedNew once user is available
  useEffect(() => {
    if (user?._id || user?.id) {
      setDismissedNew(getDismissed(user?._id || user?.id));
    }
  }, [user?._id, user?.id]);

  useEffect(() => {
    setTemplates(getTemplates());
    const onStorage = () => setTemplates(getTemplates());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryAPI.getAll();
        setCategories(response.data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!newStatus) return;
    const match = templates.find(t => {
      const title = t.title?.toLowerCase() || '';
      const status = newStatus.toLowerCase();
      return title.includes(status) || title.includes(status.replace(' ', ''));
    });
    if (match) setAdminComment(match.body);
  }, [newStatus, templates]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.status-dropdown-wrapper')) setShowStatusDropdown(false);
      if (!e.target.closest('.category-dropdown-wrapper')) setShowCategoryDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    if (statusParam) setStatusFilter(statusParam);
  }, [location.search]);

  useEffect(() => { fetchFeedback(); }, [statusFilter]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openId = params.get('open');
    if (openId && feedback.length > 0) {
      const item = feedback.find(f => f._id === openId);
      if (item) { handleViewDetails(item); navigate('/feedback', { replace: true }); }
    }
  }, [location.search, feedback]);

  const fetchFeedback = async () => {
    try {
      const params = (statusFilter !== null && statusFilter !== 'All') ? { status: statusFilter } : {};
      const response = await feedbackAPI.getAll(params);
      const allFeedback = response.data.feedback || [];
      setFeedback(allFeedback);
      await checkUnreadChats(allFeedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUnreadChats = async (allFeedback) => {
    const lastRead = getLastRead();
    const unreadMap = new Map();
    await Promise.all(
      allFeedback.map(async (item) => {
        try {
          const msgRes = await feedbackAPI.getMessages(item._id);
          const messages = msgRes.data.messages || [];
          if (messages.length === 0) return;
          const lastReadId = lastRead[item._id];
          let unreadCount = 0;
          if (!lastReadId) {
            unreadCount = messages.filter(m => m.senderRole === 'student').length;
          } else {
            const lastReadIndex = messages.findIndex(m => m._id === lastReadId);
            if (lastReadIndex !== -1) {
              unreadCount = messages
                .slice(lastReadIndex + 1)
                .filter(m => m.senderRole === 'student').length;
            }
          }
          if (unreadCount > 0) unreadMap.set(item._id, unreadCount);
        } catch {}
      })
    );
    setUnreadChats(unreadMap);
  };

  const handleViewDetails = async (item) => {
    const userId = user?._id || user?.id;
    addDismissed(item._id, userId);
    setDismissedNew(getDismissed(userId));
    window.dispatchEvent(new Event('feedbackDismissed'));
    window.dispatchEvent(new CustomEvent('feedbackModalOpen', { detail: { open: true } }));
    setSelectedFeedback(item);
    setNewStatus(item.status);
    setAdminComment(item.adminResponse?.comment || '');
    setShowModal(true);
    setTemplates(getTemplates());
  };

  const handleChatClick = async (item) => {
    try {
      const msgRes = await feedbackAPI.getMessages(item._id);
      const messages = msgRes.data.messages || [];
      if (messages.length > 0) markChatRead(item._id, messages[messages.length - 1]._id);
    } catch {}
    setUnreadChats(prev => { const next = new Map(prev); next.delete(item._id); return next; });
    navigate(`/feedback/${item._id}/chat`, {
      state: {
        isAnonymous: item.isAnonymous,
        studentName: item.student?.name
      }
    });
  };

  const handleUpdateStatus = async () => {
    try {
      await feedbackAPI.updateStatus(selectedFeedback._id, { status: newStatus, comment: adminComment });
      if (adminComment.trim()) await feedbackAPI.sendMessage(selectedFeedback._id, adminComment.trim());
      setShowModal(false);
window.dispatchEvent(new CustomEvent('feedbackModalOpen', { detail: { open: false } }));
fetchFeedback();
      alert('Feedback updated successfully!');
    } catch (error) {
      alert(`Failed to update feedback: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      try {
        await feedbackAPI.delete(id);
        fetchFeedback();
        alert('Feedback deleted successfully!');
      } catch (error) {
        alert(`Failed to delete feedback: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const clearDateFilter = () => { setDateFrom(''); setDateTo(''); };

  const isNewFeedback = (item) => {
    if (dismissedNew.has(item._id)) return false;
    const hoursDiff = (new Date() - new Date(item.createdAt)) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

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

  const dropdownPanelStyle = isLightMode
    ? { background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(196,181,253,0.5)', boxShadow: '0 8px 32px rgba(109,40,217,0.15)' }
    : { background: '#1a1025', border: '1px solid rgba(255,255,255,0.1)' };

  const dropdownBadgeInactiveStyle = isLightMode ? 'bg-gray-100 text-gray-500' : 'bg-white/10 text-gray-500';
  const categoryDropdownItemActiveStyle = isLightMode ? 'bg-pink-100 text-pink-700' : 'bg-pink-500/20 text-pink-300';
  const categoryDropdownItemInactiveStyle = isLightMode ? 'text-gray-700 hover:bg-pink-50' : 'text-gray-400 hover:bg-white/10';
  const categoryDropdownBadgeActiveStyle = isLightMode ? 'bg-pink-200 text-pink-700' : 'bg-pink-500/30 text-pink-300';

  const selectStyle = isLightMode
    ? { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(196,181,253,0.4)', colorScheme: 'light', color: '#1e1b4b' }
    : { background: '#1a1025', border: '1px solid rgba(255,255,255,0.15)', colorScheme: 'dark', color: '#ffffff' };
  const optionStyle = isLightMode ? { background: '#ffffff', color: '#1e1b4b' } : { background: '#1a1025' };

  const STATUS_BUTTON_COLORS = isLightMode ? STATUS_BUTTON_COLORS_LIGHT : STATUS_BUTTON_COLORS_DARK;

  const getStatusBadge = (status) => {
    const s = STATUS_STYLES[status] || { pill: 'bg-gray-500/20 text-gray-300 border border-gray-500/40', dot: 'bg-gray-400' };
    return (
      <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.pill}`}
        style={{ width: '130px', minWidth: '130px' }}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
        {status}
      </span>
    );
  };

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
      ))}
    </div>
  );

  const getRatingLabel = (rating) => {
    switch (rating) {
      case 1: return 'Very Unsatisfied'; case 2: return 'Unsatisfied';
      case 3: return 'Neutral'; case 4: return 'Satisfied'; case 5: return 'Very Satisfied';
      default: return '';
    }
  };

  const selectedCategoryObj = categoryFilter !== 'All'
    ? categories.find(c => c._id === categoryFilter)
    : null;

  const filteredFeedback = feedback.filter((item) => {
    const matchesSearch =
      item.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === null || statusFilter === 'All' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || item.category?._id === categoryFilter;
    const itemDate = new Date(item.createdAt);
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    return matchesSearch && matchesStatus && matchesCategory && (from ? itemDate >= from : true) && (to ? itemDate <= to : true);
  });

  const activeStatus = statusFilter === null ? null : statusFilter;
  const activeButtonColors = activeStatus && activeStatus !== 'All'
    ? STATUS_BUTTON_COLORS[activeStatus]
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-gray-400 text-sm">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
   <div className="p-6 space-y-5" style={{ marginTop: '-1.2rem' }}>
      <style>{`.feedback-search-input::placeholder { color: #1e1b4b !important; opacity: 0.5 !important; }`}</style>

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Feedback Management</h1>
          <p className="text-gray-400 text-sm mt-1">Review, respond, and manage student submissions.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {feedback.length} total submissions
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: '#1e1b4b' }} />
          <input
            type="text"
            placeholder="Search by student, subject, or description..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all feedback-search-input"
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

        {/* ── Status Filter ── */}
        <div className="relative status-dropdown-wrapper">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
            style={
              activeButtonColors
                ? {
                    background: activeButtonColors.bg,
                    borderColor: activeButtonColors.border,
                    color: activeButtonColors.color,
                    boxShadow: isLightMode ? `0 2px 12px ${activeButtonColors.bg}99` : undefined,
                  }
                : {
                    background: isLightMode ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.05)',
                    borderColor: isLightMode ? 'rgba(196,181,253,0.5)' : 'rgba(255,255,255,0.1)',
                    color: isLightMode ? '#4c1d95' : '#9ca3af',
                  }
            }
          >
            <Filter className="w-4 h-4" />
            <span>{statusFilter === null ? 'Filter Status' : statusFilter}</span>
            {activeStatus && activeStatus !== 'All' && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: isLightMode ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                  color: activeButtonColors?.color || '#fff',
                }}
              >
                {feedback.filter(f => f.status === activeStatus).length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showStatusDropdown && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50 shadow-2xl" style={dropdownPanelStyle}>
              {STATUS_TABS.map(tab => {
                const count = tab === 'All' ? feedback.length : feedback.filter(f => f.status === tab).length;
                const isActive = tab === 'All'
                  ? (statusFilter === null || statusFilter === 'All')
                  : statusFilter === tab;
                const palette = STATUS_DROPDOWN_COLORS[tab];
                const c = isLightMode ? palette.activeLight : palette.active;

                return (
                  <button
                    key={tab}
                    onClick={() => { setStatusFilter(tab); setShowStatusDropdown(false); }}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm transition-all"
                    style={isActive
                      ? { background: c.bg, borderLeft: `3px solid ${c.border}`, color: c.color }
                      : { color: isLightMode ? '#374151' : '#9ca3af' }
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: palette.dot }} />
                      <span className={isActive ? 'font-semibold' : ''}>{tab}</span>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={isActive
                        ? { background: c.badge, color: c.color, border: `1px solid ${c.border}` }
                        : { background: isLightMode ? '#f3f4f6' : 'rgba(255,255,255,0.08)', color: isLightMode ? '#6b7280' : '#6b7280' }
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Category Filter ── */}
        <div className="relative category-dropdown-wrapper">
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              categoryFilter !== 'All' ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            style={
              categoryFilter !== 'All' && isLightMode
                ? { background: '#db2777', borderColor: '#be185d', color: '#ffffff', boxShadow: '0 2px 12px rgba(219,39,119,0.35)' }
                : undefined
            }
          >
            <span className="text-base leading-none">{selectedCategoryObj ? selectedCategoryObj.icon : '🗂️'}</span>
            <span className="max-w-[120px] truncate">{categoryFilter === 'All' ? 'Filter Category' : selectedCategoryObj?.name || 'Category'}</span>
            {categoryFilter !== 'All' && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={
                  isLightMode
                    ? { background: 'rgba(255,255,255,0.3)', color: '#ffffff' }
                    : { background: 'rgba(236,72,153,0.3)', color: '#f9a8d4' }
                }
              >
                {feedback.filter(f => f.category?._id === categoryFilter).length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showCategoryDropdown && (
            <div className="absolute right-0 top-full mt-2 w-60 rounded-xl overflow-hidden z-50 shadow-2xl"
              style={{ ...dropdownPanelStyle, maxHeight: '320px', overflowY: 'auto' }}>
              <button onClick={() => { setCategoryFilter('All'); setShowCategoryDropdown(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all ${categoryFilter === 'All' ? categoryDropdownItemActiveStyle : categoryDropdownItemInactiveStyle}`}>
                <div className="flex items-center gap-2">
                  <span>🗂️</span>
                  <span className={categoryFilter === 'All' ? 'font-semibold' : ''}>All Categories</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${categoryFilter === 'All' ? categoryDropdownBadgeActiveStyle : dropdownBadgeInactiveStyle}`}>
                  {feedback.length}
                </span>
              </button>
              {categories.map(cat => {
                const count = feedback.filter(f => f.category?._id === cat._id).length;
                const isActive = categoryFilter === cat._id;
                return (
                  <button key={cat._id} onClick={() => { setCategoryFilter(cat._id); setShowCategoryDropdown(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all ${isActive ? categoryDropdownItemActiveStyle : categoryDropdownItemInactiveStyle}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{cat.icon}</span>
                      <span className={`truncate ${isActive ? 'font-semibold' : ''}`}>{cat.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ml-2 ${isActive ? categoryDropdownBadgeActiveStyle : dropdownBadgeInactiveStyle}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Date Range Button ── */}
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
          style={
            (dateFrom || dateTo)
              ? {
                  background: 'rgba(139,92,246,0.15)',
                  borderColor: 'rgba(109,40,217,0.4)',
                  color: isLightMode ? '#6d28d9' : '#a78bfa',
                }
              : {
                  background: isLightMode ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.05)',
                  borderColor: isLightMode ? 'rgba(196,181,253,0.5)' : 'rgba(255,255,255,0.1)',
                  color: isLightMode ? '#4c1d95' : '#9ca3af',
                }
          }
        >
          <Calendar className="w-4 h-4" />
          {(dateFrom || dateTo) ? 'Date filtered' : 'Date range'}
        </button>
      </div>

      {/* ── Date Range Panel ── */}
      {showDateFilter && (
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-4">
          <span className="text-gray-400 text-sm shrink-0">From</span>
          <input type="date" className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 [color-scheme:dark]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-gray-400 text-sm shrink-0">to</span>
          <input type="date" className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 [color-scheme:dark]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          {(dateFrom || dateTo) && (
            <button onClick={clearDateFilter} className="ml-auto flex items-center gap-1.5 text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* ── Results count ── */}
      <p className="text-gray-500 text-xs">
        Showing <span className="text-white font-semibold">{filteredFeedback.length}</span> of <span className="text-white font-semibold">{feedback.length}</span> feedback
        {statusFilter !== null && statusFilter !== 'All' && <span className="ml-2 text-violet-400">· {statusFilter}</span>}
        {categoryFilter !== 'All' && selectedCategoryObj && (
          <span className="ml-2 text-pink-400">· {selectedCategoryObj.icon} {selectedCategoryObj.name}</span>
        )}
        {(dateFrom || dateTo) && <span className="ml-2 text-violet-400">· {dateFrom || '…'} → {dateTo || '…'}</span>}
      </p>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '2px solid rgba(0,0,0,0.3)' }}>
              {['Student', 'Subject', 'Category', ...(isAdmin ? ['Handled By'] : []), 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredFeedback.length === 0 ? (
              <tr>
                <td {...(isAdmin ? { colSpan: 7 } : { colSpan: 6 })} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-medium">No feedback found</p>
                    <p className="text-gray-600 text-sm">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredFeedback.map((item) => {
                const showNew = isNewFeedback(item);
                const unreadCount = unreadChats.get(item._id) || 0;
                const hasUnread = unreadCount > 0;
                const dueStatus = getDueStatus(item);
                const dueBadge = dueStatus ? DUE_BADGE[dueStatus] : null;
                const isOthers = item.category?.name?.toLowerCase().trim() === 'others' || item.category?.name?.toLowerCase().trim() === 'other';
                const isAnonymousHidden = item.isAnonymous && !isAdmin;
                return (
                  <tr key={item._id} className="group transition-all hover:bg-white/[0.04]" style={{ borderBottom: '1px solid rgba(0,0,0,0.25)' }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        {showNew && (
                          <div className="relative shrink-0">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <div className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75" />
                          </div>
                        )}
                        {isAnonymousHidden ? (
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                            border: '2px solid rgba(255,255,255,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 16,
                          }}>
                            🕵️
                          </div>
                        ) : (
                          <StudentAvatar
                            src={item.student?.profilePicture}
                            name={item.student?.name}
                            size={34}
                          />
                        )}
                        <div>
                          {isAnonymousHidden ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400 text-sm font-semibold italic">Anonymous</span>
                              <span className="text-[9px] bg-gray-500/20 text-gray-400 border border-gray-500/30 px-1.5 py-0.5 rounded-full font-semibold">🕵️ Hidden</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <p className="text-white text-sm font-semibold">{item.student?.name}</p>
                                {item.isAnonymous && isAdmin && (
                                  <span className="text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full font-semibold">🕵️ Anon</span>
                                )}
                              </div>
                              <p className="text-gray-500 text-xs">{item.student?.studentId}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium max-w-[160px] truncate">{item.subject}</span>
                        {showNew && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-black tracking-wide shrink-0">NEW</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex flex-col gap-0.5" style={{ width: '180px', minWidth: '180px' }}>
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-300 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                          <span className="shrink-0">{item.category?.icon}</span>
                          <span className="truncate">{item.category?.name}</span>
                        </span>
                        {isOthers && item.otherSpecification && (
                          <span className="text-xs text-gray-400 px-3 italic truncate">
                            "{item.otherSpecification}"
                          </span>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        {item.lastUpdatedBy ? (
                          <div>
                            <p className="text-xs font-medium leading-tight" style={{ color: isLightMode ? '#111827' : '#ffffff', fontWeight: 600 }}>{item.lastUpdatedBy.name}</p>
                            <p className="text-[10px] capitalize" style={{ color: isLightMode ? '#6b7280' : '#ffffff' }}>{item.lastUpdatedBy.role}</p>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(item.status)}
                        {dueBadge && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${dueBadge.cls}`}>
                            {dueBadge.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-sm tabular-nums">
                        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleViewDetails(item)} title="View Details"
                          className="p-2 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500 border border-blue-500/30 hover:border-blue-500 transition-all">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => handleChatClick(item)} title={hasUnread ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Chat'}
                          className="relative p-2 rounded-lg text-violet-400 hover:text-white hover:bg-violet-500 border border-violet-500/30 hover:border-violet-500 transition-all">
                          <MessageSquare size={15} />
                          {hasUnread && (
                            <span
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-bold rounded-full border-2 border-gray-900 animate-pulse flex items-center justify-center"
                              style={{ fontSize: '9px', minWidth: '16px', height: '16px', padding: '0 3px' }}
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </button>
                        <button onClick={() => handleDelete(item._id)} title="Delete"
                          className="p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 hover:border-red-500 transition-all">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      {mounted && showModal && selectedFeedback && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="feedback-modal rounded-2xl w-full flex flex-col"
            style={{
              maxWidth: '1000px', maxHeight: '90vh',
              background: isLightMode ? 'rgba(245,243,255,0.97)' : 'linear-gradient(145deg, #1a1025, #0f0a1a)',
              border: isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,255,255,0.12)',
              boxShadow: isLightMode ? '0 25px 60px rgba(109,40,217,0.15)' : '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(109,40,217,0.2)',
            }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                {selectedFeedback.isAnonymous && !isAdmin ? (
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}>🕵️</div>
                ) : (
                  <StudentAvatar
                    src={selectedFeedback.student?.profilePicture}
                    name={selectedFeedback.student?.name}
                    size={38}
                  />
                )}
                <div>
                  <h2 className="text-base font-bold" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>Feedback Details</h2>
                  <p className="text-xs" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>Review and respond to this submission</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedFeedback.status)}
                {(() => { const ds = getDueStatus(selectedFeedback); const db = ds ? DUE_BADGE[ds] : null;
                  return db ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${db.cls}`}>{db.label}</span> : null;
                })()}
              <button onClick={() => { setShowModal(false); window.dispatchEvent(new CustomEvent('feedbackModalOpen', { detail: { open: false } })); }} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 min-h-0 divide-x divide-white/10">
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-w-0">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      label: 'Student',
                      value: selectedFeedback.isAnonymous && !isAdmin ? 'Anonymous Student' : selectedFeedback.student?.name,
                      sub: selectedFeedback.isAnonymous && !isAdmin ? null : selectedFeedback.student?.studentId,
                      badge: selectedFeedback.isAnonymous ? (isAdmin ? '🕵️ Submitted Anonymously' : '🕵️ Anonymous') : null,
                    },
                    { label: 'Subject', value: selectedFeedback.subject },
                    {
                      label: 'Category',
                      value: `${selectedFeedback.category?.icon || ''} ${selectedFeedback.category?.name || ''}`,
                      sub: (
                        selectedFeedback.category?.name?.toLowerCase().trim() === 'others' ||
                        selectedFeedback.category?.name?.toLowerCase().trim() === 'other'
                      ) && selectedFeedback.otherSpecification
                        ? `Specified: "${selectedFeedback.otherSpecification}"`
                        : null,
                    },
                    selectedFeedback.teacherName ? { label: 'Teacher', value: selectedFeedback.teacherName } : { label: 'Priority', value: selectedFeedback.priority },
                    selectedFeedback.location ? { label: 'Location', value: `📍 ${selectedFeedback.location}` } : null,
                    selectedFeedback.dateTime ? { label: 'Class Date & Time', value: `🕐 ${selectedFeedback.dateTime}` } : null,
                    { label: 'Submitted', value: new Date(selectedFeedback.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                    selectedFeedback.lastUpdatedBy ? { label: 'Last Updated By', value: selectedFeedback.lastUpdatedBy?.name, badge: selectedFeedback.lastUpdatedBy?.role } : null,
                  ].filter(Boolean).map((field, i) => (
                    <div key={i} className="rounded-lg px-3 py-2" style={{ background: isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.04)', border: isLightMode ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[9px] uppercase tracking-widests font-semibold mb-0.5" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>{field.label}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium leading-snug" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>{field.value}</p>
                        {field.badge && <span className="text-[10px] bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full">{field.badge}</span>}
                      </div>
                      {field.sub && <p className="text-xs mt-0.5 italic" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>{field.sub}</p>}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg px-3 py-2" style={{ background: isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.04)', border: isLightMode ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] uppercase tracking-widests font-semibold mb-0.5" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>Description</p>
                  <p className="text-sm leading-relaxed" style={{ color: isLightMode ? '#1e1b4b' : '#e5e7eb' }}>{selectedFeedback.description}</p>
                </div>

                {selectedFeedback.media && selectedFeedback.media.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widests font-semibold mb-1" style={{ color: isLightMode ? '#6d28d9' : '#6b7280' }}>Attached Media</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {selectedFeedback.media.map((file, index) => (
                        <div key={index} className="rounded-lg overflow-hidden border border-white/10">
                          {file.type === 'video'
                            ? <video src={file.url} controls className="w-full h-20 object-cover bg-black" />
                            : <img src={file.url} alt={`Attachment ${index + 1}`} className="w-full h-20 object-cover cursor-pointer hover:opacity-90 transition" onClick={() => window.open(file.url, '_blank')} />
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isAdmin && selectedFeedback.status === 'Resolved' && (
                  <div className="rounded-lg px-3 py-3" style={{ background: isLightMode ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.08)', border: isLightMode ? '1.5px solid rgba(245,158,11,0.3)' : '1px solid rgba(245,158,11,0.25)' }}>
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: isLightMode ? '#92400e' : '#d97706' }}>Student Satisfaction Rating</p>
                    {selectedFeedback.satisfactionRating ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          {renderStars(selectedFeedback.satisfactionRating)}
                          <span className="text-sm font-semibold" style={{ color: isLightMode ? '#92400e' : '#fbbf24' }}>
                            {selectedFeedback.satisfactionRating}/5 — {getRatingLabel(selectedFeedback.satisfactionRating)}
                          </span>
                        </div>
                        {selectedFeedback.satisfactionComment && <p className="text-xs italic" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>"{selectedFeedback.satisfactionComment}"</p>}
                        {selectedFeedback.ratedAt && <p className="text-[10px]" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>Rated on {new Date(selectedFeedback.ratedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>Student has not rated this resolution yet.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="feedback-modal-right w-72 shrink-0 p-4 flex flex-col gap-3" style={{ background: isLightMode ? 'rgba(237,233,254,0.4)' : 'transparent' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: isLightMode ? '#4c1d95' : '#9ca3af' }}>Update Feedback</p>
                  <div className="flex items-center gap-2 mb-3 rounded-lg px-3 py-2" style={{ background: isLightMode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.04)', border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs" style={{ color: '#6b7280' }}>Current:</p>
                    {getStatusBadge(selectedFeedback.status)}
                  </div>
                  <div className="mb-3">
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>New Status</p>
                    <select className="modal-status-select w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" style={selectStyle} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                      <option value="Pending" style={optionStyle}>Pending</option>
                      <option value="Under Review" style={optionStyle}>Under Review</option>
                      <option value="Rejected" style={optionStyle}>Rejected</option>
                      <option value="Resolved" style={optionStyle}>Resolved</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>
                      {user?.role === 'staff' ? 'Staff Response' : 'Admin Response'} <span className="normal-case" style={{ color: isLightMode ? '#9ca3af' : '#4b5563' }}>· sent to chat</span>
                    </p>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none"
                      style={{ background: isLightMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.06)', border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.12)', color: isLightMode ? '#1e1b4b' : undefined }}
                      rows="5" value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Add your response..." />
                  </div>
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <button onClick={handleUpdateStatus}
                    className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                    Update Feedback
                  </button>
                 <button onClick={() => { setShowModal(false); window.dispatchEvent(new CustomEvent('feedbackModalOpen', { detail: { open: false } })); }}
    className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:bg-white/10"
                    style={{ background: isLightMode ? 'rgba(237,233,254,0.6)' : 'rgba(255,255,255,0.06)', border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.12)', color: isLightMode ? '#4c1d95' : '#d1d5db' }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FeedbackManagement;