import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { feedbackAPI } from '../services/api';
import { getSchedules, saveSchedules } from '../utils/scheduleHelpers';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ChevronRight,
  Search,
  CalendarPlus,
  CalendarCheck,
  X,
  Eye,
  MessageSquare,
  Star,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'all',          label: 'All Unresolved', color: 'from-violet-500 to-pink-500' },
  { key: 'Pending',      label: 'Pending',        color: 'from-yellow-500 to-orange-500' },
  { key: 'Under Review', label: 'Under Review',   color: 'from-blue-500 to-cyan-500' },
];

const STATUS_STYLE = {
  Pending:        { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  'Under Review': { bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/30',   dot: 'bg-blue-400' },
  Resolved:       { bg: 'bg-green-500/20',  text: 'text-green-300',  border: 'border-green-500/30',  dot: 'bg-green-400' },
  Rejected:       { bg: 'bg-red-500/20',    text: 'text-red-300',    border: 'border-red-500/30',    dot: 'bg-red-400' },
};

const STATUS_STYLES = {
  Pending:        { pill: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40', dot: 'bg-yellow-400' },
  'Under Review': { pill: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',       dot: 'bg-blue-400'   },
  Resolved:       { pill: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40', dot: 'bg-emerald-400' },
  Rejected:       { pill: 'bg-red-500/20 text-red-300 border border-red-500/40',           dot: 'bg-red-400'    },
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

const TEMPLATES_KEY = 'responseTemplates';
const getTemplates = () => {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); }
  catch { return []; }
};

const StaffManageFeedback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  // Schedule modal state
  const [scheduleModal, setScheduleModal] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [schedules, setSchedules] = useState(getSchedules);

  // Details modal state (from FeedbackManagement)
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [templates, setTemplates] = useState([]);

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
    setTemplates(getTemplates());
    const onStorage = () => setTemplates(getTemplates());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Auto-fill admin comment template when status changes
  useEffect(() => {
    if (!newStatus) return;
    const match = templates.find(t => {
      const title = t.title?.toLowerCase() || '';
      const status = newStatus.toLowerCase();
      return title.includes(status) || title.includes(status.replace(' ', ''));
    });
    if (match) setAdminComment(match.body);
  }, [newStatus, templates]);

  const fetchFeedback = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const response = await feedbackAPI.getAll({});
      const all = response.data.feedback || [];
      const currentSchedules = getSchedules();
      const scheduledIds = new Set(currentSchedules.map(s => s.feedbackId));
      const unresolved = all.filter(f =>
        f.status !== 'Resolved' &&
        f.status !== 'Rejected' &&
        !scheduledIds.has(f._id)
      );
      setFeedback(unresolved);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const filtered = feedback.filter(item => {
    const matchesTab = activeTab === 'all' || item.status === activeTab;
    const matchesSearch =
      !search ||
      item.subject?.toLowerCase().includes(search.toLowerCase()) ||
      item.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount     = feedback.filter(f => f.status === 'Pending').length;
  const underReviewCount = feedback.filter(f => f.status === 'Under Review').length;

  const getAge = (date) => {
    const diff = Date.now() - new Date(date);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const isUrgent = (date) => {
    const days = Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));
    return days >= 5;
  };

  const getScheduleForFeedback = (id) => schedules.find(s => s.feedbackId === id);

  // ── Schedule modal handlers ──
  const handleOpenSchedule = (e, item) => {
    e.stopPropagation();
    const existing = getScheduleForFeedback(item._id);
    setScheduleNote(existing?.note || '');
    setScheduleDate(existing?.date || '');
    setScheduleModal(item);
    setScheduleSuccess(false);
  };

  const handleSaveSchedule = () => {
    if (!scheduleDate) return;
    const current = getSchedules();
    const updated = current.filter(s => s.feedbackId !== scheduleModal._id);
    updated.push({
      feedbackId: scheduleModal._id,
      studentName: scheduleModal.student?.name,
      subject: scheduleModal.subject,
      note: scheduleNote,
      date: scheduleDate,
      createdAt: new Date().toISOString(),
    });
    saveSchedules(updated);
    setSchedules(updated);
    setScheduleSuccess(true);
    setTimeout(() => {
      setScheduleModal(null);
      setScheduleDate('');
      setScheduleNote('');
      setScheduleSuccess(false);
      navigate('/schedules');
    }, 1500);
  };

  const handleCloseScheduleModal = () => {
    setScheduleModal(null);
    setScheduleDate('');
    setScheduleNote('');
    setScheduleSuccess(false);
  };

  // ── Details modal handlers ──
  const handleViewDetails = (item) => {
    setSelectedFeedback(item);
    setNewStatus(item.status);
    setAdminComment(item.adminResponse?.comment || '');
    setShowDetailsModal(true);
    setTemplates(getTemplates());
  };

  const handleUpdateStatus = async () => {
    try {
      await feedbackAPI.updateStatus(selectedFeedback._id, { status: newStatus, comment: adminComment });
      if (adminComment.trim()) await feedbackAPI.sendMessage(selectedFeedback._id, adminComment.trim());
      setShowDetailsModal(false);
      fetchFeedback();
      alert('Feedback updated successfully!');
    } catch (error) {
      alert(`Failed to update feedback: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleChatFromDetails = () => {
    if (!selectedFeedback) return;
    setShowDetailsModal(false);
    navigate(`/feedback/${selectedFeedback._id}/chat`);
  };

  // ── Helpers ──
  const getStatusBadge = (status) => {
    const s = STATUS_STYLES[status] || { pill: 'bg-gray-500/20 text-gray-300 border border-gray-500/40', dot: 'bg-gray-400' };
    return (
      <span
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.pill}`}
        style={{ width: '130px', minWidth: '130px' }}
      >
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

  const selectStyle = isLightMode
    ? { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(196,181,253,0.4)', colorScheme: 'light', color: '#1e1b4b' }
    : { background: '#1a1025', border: '1px solid rgba(255,255,255,0.15)', colorScheme: 'dark', color: '#ffffff' };
  const optionStyle = isLightMode ? { background: '#ffffff', color: '#1e1b4b' } : { background: '#1a1025' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Manage Feedback</h1>
            <p className="text-gray-400 text-sm">All pending and unresolved submissions that need your attention.</p>
          </div>
          <button
            onClick={() => fetchFeedback(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-all border border-white/20"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/20">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingCount}</p>
              <p className="text-gray-400 text-sm">Pending</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <AlertCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{underReviewCount}</p>
              <p className="text-gray-400 text-sm">Under Review</p>
            </div>
          </div>
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student, subject, category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex gap-2">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  activeTab === tab.key
                    ? `bg-gradient-to-r ${tab.color} text-white border-transparent`
                    : 'bg-white/10 text-gray-400 border-white/20 hover:bg-white/20 hover:text-white'
                }`}
              >
                {tab.label}
                {tab.key === 'Pending' && pendingCount > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                )}
                {tab.key === 'Under Review' && underReviewCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">{underReviewCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback List */}
        {filtered.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-16 flex flex-col items-center justify-center gap-3">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <p className="text-white font-semibold text-lg">All caught up!</p>
            <p className="text-gray-400 text-sm">No unresolved feedback found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const style = STATUS_STYLE[item.status] || STATUS_STYLE['Pending'];
              const urgent = isUrgent(item.createdAt);
              const scheduled = getScheduleForFeedback(item._id);

              return (
                <div
                  key={item._id}
                  onClick={() => handleViewDetails(item)}
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 hover:bg-white/15 hover:border-violet-500/40 transition-all cursor-pointer p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-sm truncate">{item.subject}</p>
                          {urgent && (
                            <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full shrink-0">
                              ⚠ Overdue (5+ days)
                            </span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-gray-400 text-xs">{item.student?.name}</p>
                        <span className="text-gray-600 text-xs">·</span>
                        <p className="text-gray-400 text-xs">{item.category?.icon} {item.category?.name}</p>
                        <span className="text-gray-600 text-xs">·</span>
                        <p className="text-gray-500 text-xs">{getAge(item.createdAt)}</p>
                      </div>

                      {item.description && (
                        <p className="text-gray-500 text-xs mt-1.5 line-clamp-1">{item.description}</p>
                      )}

                      {scheduled && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <CalendarCheck className="w-3 h-3 text-violet-400" />
                          <span className="text-violet-300 text-xs">
                            Scheduled: {new Date(scheduled.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className={`w-36 flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${style.bg} ${style.text} ${style.border}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {item.status}
                      </div>
                      <button
                        onClick={(e) => handleOpenSchedule(e, item)}
                        className={`w-36 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          scheduled
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30'
                            : 'bg-white/10 text-gray-400 border-white/20 hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        {scheduled ? 'Edit Schedule' : 'Schedule'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Schedule Modal ── */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" style={{
            background: isLightMode ? 'rgba(255,255,255,0.97)' : '#111827',
            border: isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,255,255,0.2)',
            boxShadow: isLightMode ? '0 25px 60px rgba(109,40,217,0.15)' : '0 25px 60px rgba(0,0,0,0.6)',
          }}>
            {scheduleSuccess ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CalendarCheck className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white font-semibold text-lg">Schedule Saved!</p>
                <p className="text-gray-400 text-sm">Redirecting to My Schedules...</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="font-bold text-xl" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>Create Schedule</h2>
                    <p className="text-sm mt-0.5" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>Set a resolution target for this feedback</p>
                  </div>
                  <button onClick={handleCloseScheduleModal} className="transition-colors" style={{ color: isLightMode ? '#ef4444' : '#6b7280' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="rounded-xl p-4 mb-5" style={{ background: isLightMode ? 'rgba(237,233,254,0.45)' : 'rgba(255,255,255,0.05)', border: isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>{scheduleModal.student?.name}</p>
                      <p className="text-xs truncate" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>{scheduleModal.subject}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${STATUS_STYLE[scheduleModal.status]?.bg} ${STATUS_STYLE[scheduleModal.status]?.text} ${STATUS_STYLE[scheduleModal.status]?.border}`}>
                      {scheduleModal.status}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium block mb-1.5" style={{ color: isLightMode ? '#4c1d95' : '#d1d5db' }}>Note / Description</label>
                  <textarea
                    rows={3}
                    value={scheduleNote}
                    onChange={e => setScheduleNote(e.target.value)}
                    placeholder="What needs to be done for this feedback?"
                    className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    style={{ background: isLightMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)', border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.2)', color: isLightMode ? '#1e1b4b' : '#ffffff' }}
                  />
                </div>

                <div className="mb-6">
                  <label className="text-sm font-medium block mb-1.5" style={{ color: isLightMode ? '#4c1d95' : '#d1d5db' }}>Target Resolution Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    style={{ background: isLightMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)', border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.2)', color: isLightMode ? '#1e1b4b' : '#ffffff', colorScheme: isLightMode ? 'light' : 'dark' }}
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={handleSaveSchedule} disabled={!scheduleDate}
                    className="flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 text-white font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    Create Schedule
                  </button>
                  <button onClick={handleCloseScheduleModal}
                    className="px-5 py-2.5 rounded-lg transition-all"
                    style={{ background: isLightMode ? 'rgba(237,233,254,0.6)' : 'rgba(255,255,255,0.1)', color: isLightMode ? '#4c1d95' : '#ffffff', border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : 'none' }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Feedback Details Modal (from FeedbackManagement) ── */}
      {showDetailsModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div
            className="feedback-modal rounded-2xl w-full flex flex-col"
            style={{
              maxWidth: '1000px', maxHeight: '90vh',
              background: isLightMode ? 'rgba(245,243,255,0.97)' : 'linear-gradient(145deg, #1a1025, #0f0a1a)',
              border: isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,255,255,0.12)',
              boxShadow: isLightMode ? '0 25px 60px rgba(109,40,217,0.15)' : '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(109,40,217,0.2)',
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-base font-bold" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>Feedback Details</h2>
                <p className="text-xs" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>Review and respond to this submission</p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedFeedback.status)}
                {(() => {
                  const ds = getDueStatus(selectedFeedback);
                  const db = ds ? DUE_BADGE[ds] : null;
                  return db ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${db.cls}`}>{db.label}</span> : null;
                })()}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Two-column body */}
            <div className="flex flex-1 min-h-0 divide-x divide-white/10">
              {/* LEFT */}
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
                    selectedFeedback.teacherName
                      ? { label: 'Teacher', value: selectedFeedback.teacherName }
                      : { label: 'Priority', value: selectedFeedback.priority },
                    selectedFeedback.location ? { label: 'Location', value: `📍 ${selectedFeedback.location}` } : null,
                    selectedFeedback.dateTime ? { label: 'Class Date & Time', value: `🕐 ${selectedFeedback.dateTime}` } : null,
                    { label: 'Submitted', value: new Date(selectedFeedback.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                    selectedFeedback.lastUpdatedBy
                      ? { label: 'Last Updated By', value: selectedFeedback.lastUpdatedBy?.name, badge: selectedFeedback.lastUpdatedBy?.role }
                      : null,
                  ].filter(Boolean).map((field, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-3 py-2"
                      style={{
                        background: isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.04)',
                        border: isLightMode ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>{field.label}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium leading-snug" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>{field.value}</p>
                        {field.badge && <span className="text-[10px] bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full">{field.badge}</span>}
                      </div>
                      {field.sub && <p className="text-xs mt-0.5 italic" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>{field.sub}</p>}
                    </div>
                  ))}
                </div>

                <div
                  className="rounded-lg px-3 py-2"
                  style={{
                    background: isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.04)',
                    border: isLightMode ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>Description</p>
                  <p className="text-sm leading-relaxed" style={{ color: isLightMode ? '#1e1b4b' : '#e5e7eb' }}>{selectedFeedback.description}</p>
                </div>

                {selectedFeedback.media && selectedFeedback.media.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#6d28d9' : '#6b7280' }}>Attached Media</p>
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
                  <div
                    className="rounded-lg px-3 py-3"
                    style={{
                      background: isLightMode ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.08)',
                      border: isLightMode ? '1.5px solid rgba(245,158,11,0.3)' : '1px solid rgba(245,158,11,0.25)',
                    }}
                  >
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: isLightMode ? '#92400e' : '#d97706' }}>Student Satisfaction Rating</p>
                    {selectedFeedback.satisfactionRating ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          {renderStars(selectedFeedback.satisfactionRating)}
                          <span className="text-sm font-semibold" style={{ color: isLightMode ? '#92400e' : '#fbbf24' }}>
                            {selectedFeedback.satisfactionRating}/5 — {getRatingLabel(selectedFeedback.satisfactionRating)}
                          </span>
                        </div>
                        {selectedFeedback.satisfactionComment && (
                          <p className="text-xs italic" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>"{selectedFeedback.satisfactionComment}"</p>
                        )}
                        {selectedFeedback.ratedAt && (
                          <p className="text-[10px]" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>
                            Rated on {new Date(selectedFeedback.ratedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>Student has not rated this resolution yet.</p>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT */}
              <div
                className="w-72 shrink-0 p-4 flex flex-col gap-3"
                style={{ background: isLightMode ? 'rgba(237,233,254,0.4)' : 'transparent' }}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: isLightMode ? '#4c1d95' : '#9ca3af' }}>Update Feedback</p>
                  <div
                    className="flex items-center gap-2 mb-3 rounded-lg px-3 py-2"
                    style={{
                      background: isLightMode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.04)',
                      border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <p className="text-xs" style={{ color: '#6b7280' }}>Current:</p>
                    {getStatusBadge(selectedFeedback.status)}
                  </div>
                  <div className="mb-3">
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>New Status</p>
                    <select
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                      style={selectStyle}
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="Pending" style={optionStyle}>Pending</option>
                      <option value="Under Review" style={optionStyle}>Under Review</option>
                      <option value="Rejected" style={optionStyle}>Rejected</option>
                      <option value="Resolved" style={optionStyle}>Resolved</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>
                      {user?.role === 'staff' ? 'Staff Response' : 'Admin Response'}
                      <span className="normal-case ml-1" style={{ color: isLightMode ? '#9ca3af' : '#4b5563' }}>· sent to chat</span>
                    </p>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none"
                      style={{
                        background: isLightMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.06)',
                        border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.12)',
                        color: isLightMode ? '#1e1b4b' : '#ffffff',
                      }}
                      rows="5"
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      placeholder="Add your response..."
                    />
                  </div>
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <button
                    onClick={handleUpdateStatus}
                    className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
                  >
                    Update Feedback
                  </button>
                  <button
                    onClick={handleChatFromDetails}
                    className="w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 hover:bg-violet-500/20"
                    style={{
                      background: isLightMode ? 'rgba(237,233,254,0.6)' : 'rgba(255,255,255,0.06)',
                      border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.12)',
                      color: isLightMode ? '#4c1d95' : '#d1d5db',
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Open Chat
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:bg-white/10"
                    style={{
                      background: isLightMode ? 'rgba(237,233,254,0.6)' : 'rgba(255,255,255,0.06)',
                      border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.12)',
                      color: isLightMode ? '#4c1d95' : '#d1d5db',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffManageFeedback;