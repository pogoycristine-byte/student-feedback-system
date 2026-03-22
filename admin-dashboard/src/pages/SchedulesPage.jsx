import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSchedules, saveSchedules } from '../utils/scheduleHelpers';
import {
  CalendarCheck,
  CalendarClock,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Pencil,
  X,
} from 'lucide-react';

const SchedulesPage = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState(getSchedules);
  const [editModal, setEditModal] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  useEffect(() => {
    setSchedules(getSchedules());
    const onUpdate = () => setSchedules(getSchedules());
    window.addEventListener('schedulesUpdated', onUpdate);
    return () => window.removeEventListener('schedulesUpdated', onUpdate);
  }, []);

  const deleteSchedule = (feedbackId) => {
    if (!window.confirm('Delete this schedule?')) return;
    const updated = schedules.filter(s => s.feedbackId !== feedbackId);
    saveSchedules(updated);
    setSchedules(updated);
  };

  const openEdit = (s) => {
    setEditModal(s);
    setEditDate(s.date);
    setEditNote(s.note || '');
    setEditSuccess(false);
  };

  const handleSaveEdit = () => {
    if (!editDate) return;
    const updated = schedules.map(s =>
      s.feedbackId === editModal.feedbackId
        ? { ...s, date: editDate, note: editNote }
        : s
    );
    saveSchedules(updated);
    setSchedules(updated);
    setEditSuccess(true);
    setTimeout(() => {
      setEditModal(null);
      setEditDate('');
      setEditNote('');
      setEditSuccess(false);
    }, 1500);
  };

  const handleCloseEdit = () => {
    setEditModal(null);
    setEditDate('');
    setEditNote('');
    setEditSuccess(false);
  };

  const isToday = (dateStr) => new Date(dateStr).toDateString() === new Date().toDateString();
  const isOverdue = (dateStr) => new Date(dateStr) < new Date();
  const isUpcoming = (dateStr) => {
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 3;
  };

  const getLabel = (dateStr) => {
    if (isOverdue(dateStr)) return { text: 'Overdue',   bg: 'bg-red-500/20',    color: 'text-red-300',    border: 'border-red-500/30' };
    if (isToday(dateStr))   return { text: 'Due Today', bg: 'bg-yellow-500/20', color: 'text-yellow-300', border: 'border-yellow-500/30' };
    if (isUpcoming(dateStr)) return { text: 'Due Soon', bg: 'bg-blue-500/20',   color: 'text-blue-300',   border: 'border-blue-500/30' };
    return { text: 'Upcoming', bg: 'bg-white/10', color: 'text-gray-400', border: 'border-white/20' };
  };

  const sorted = [...schedules].sort((a, b) => new Date(a.date) - new Date(b.date));
  const dueToday = schedules.filter(s => isToday(s.date));

  return (
    <>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">My Schedules</h1>
          <p className="text-gray-400 text-sm">All your scheduled feedback resolutions.</p>
        </div>

        {dueToday.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-semibold text-sm">
                {dueToday.length} schedule{dueToday.length > 1 ? 's' : ''} due today!
              </p>
              <div className="mt-1 space-y-0.5">
                {dueToday.map((s, i) => (
                  <p key={i} className="text-yellow-200/70 text-xs">· {s.studentName} — {s.subject}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-16 flex flex-col items-center gap-3">
            <CalendarCheck className="w-12 h-12 text-gray-500" />
            <p className="text-white font-semibold text-lg">No schedules yet</p>
            <p className="text-gray-400 text-sm">Go to Manage Feedback to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((s, i) => {
              const label = getLabel(s.date);
              return (
                <div key={i} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 hover:bg-white/15 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-violet-500/20 shrink-0">
                      <CalendarClock className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-white font-semibold text-sm">{s.studentName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${label.bg} ${label.color} ${label.border}`}>
                          {label.text}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs truncate mb-1">{s.subject}</p>
                      {s.note && <p className="text-gray-500 text-xs line-clamp-2 mb-1">📝 {s.note}</p>}
                      <p className="text-gray-500 text-xs">
                        🗓 {new Date(s.date).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/feedback?open=${s.feedbackId}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs rounded-lg transition-all border border-violet-500/30"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded-lg transition-all border border-blue-500/30"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => deleteSchedule(s.feedbackId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-all border border-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            {editSuccess ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CalendarCheck className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white font-semibold text-lg">Schedule Updated!</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-white font-bold text-xl">Edit Schedule</h2>
                    <p className="text-gray-400 text-sm mt-0.5">Update the schedule for this feedback</p>
                  </div>
                  <button onClick={handleCloseEdit} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-white/5 rounded-xl p-4 mb-5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6D28D9, #BE185D)' }}
                    >
                      {editModal.studentName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{editModal.studentName}</p>
                      <p className="text-gray-400 text-xs truncate">{editModal.subject}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-gray-300 text-sm font-medium block mb-1.5">Note / Description</label>
                  <textarea
                    rows={3}
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    placeholder="What needs to be done for this feedback?"
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>

                <div className="mb-6">
                  <label className="text-gray-300 text-sm font-medium block mb-1.5">Target Resolution Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 [color-scheme:dark]"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editDate}
                    className="flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 text-white font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCloseEdit}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                  >
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

export default SchedulesPage;