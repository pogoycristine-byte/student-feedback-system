import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { feedbackAPI } from '../services/api';
import { getSchedules, saveSchedules } from '../utils/scheduleHelpers';
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

const StaffManageFeedback = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const [scheduleModal, setScheduleModal] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [schedules, setSchedules] = useState(getSchedules);

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

  // ── Updated to 5-day rule ──
  const isUrgent = (date) => {
    const days = Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));
    return days >= 5;
  };

  const getScheduleForFeedback = (id) => schedules.find(s => s.feedbackId === id);

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

  const handleCloseModal = () => {
    setScheduleModal(null);
    setScheduleDate('');
    setScheduleNote('');
    setScheduleSuccess(false);
  };

  const isLightMode = document.documentElement.classList.contains('light-mode') || document.body.classList.contains('light-mode');

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
                  onClick={() => navigate(`/feedback/${item._id}/chat`)}
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

      {/* Schedule Modal */}
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
                  <button onClick={handleCloseModal} className="transition-colors" style={{ color: isLightMode ? '#ef4444' : '#6b7280' }}>
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
                  <button onClick={handleCloseModal}
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
    </>
  );
};

export default StaffManageFeedback;