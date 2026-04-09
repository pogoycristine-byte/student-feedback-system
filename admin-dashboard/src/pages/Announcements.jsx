import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Pencil, Check, X, Eye, EyeOff, Filter } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Announcements = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', message: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  // ── Light mode detection ──
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

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const endpoint = isAdmin ? '/announcements/all' : '/announcements/my';
      const res = await api.get(endpoint);
      setAnnouncements(res.data.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newForm.title.trim() || !newForm.message.trim()) { alert('Please fill in both title and message.'); return; }
    setSaving(true);
    try {
      await api.post('/announcements', newForm);
      setNewForm({ title: '', message: '' });
      setShowAddForm(false);
      fetchAnnouncements();
    } catch (error) {
      alert('Failed to create announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      fetchAnnouncements();
    } catch { alert('Failed to delete.'); }
  };

  const handleToggleActive = async (announcement) => {
    try {
      await api.put(`/announcements/${announcement._id}`, { isActive: !announcement.isActive });
      fetchAnnouncements();
    } catch { alert('Failed to update.'); }
  };

  const handleStartEdit = (a) => {
    setEditingId(a._id);
    setEditForm({ title: a.title, message: a.message });
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.title.trim() || !editForm.message.trim()) { alert('Please fill in both fields.'); return; }
    setSaving(true);
    try {
      await api.put(`/announcements/${id}`, editForm);
      setEditingId(null);
      fetchAnnouncements();
    } catch { alert('Failed to update.'); }
    finally { setSaving(false); }
  };

  // ── Ownership check ──
  const canModify = (a) => {
    if (isAdmin) return true;
    const createdById = a.createdBy?._id?.toString() || a.createdBy?.toString();
    const userId = user?._id?.toString() || user?.id?.toString();
    return createdById === userId;
  };

  // ── Filter announcements based on showHidden toggle ──
  const visibleAnnouncements = announcements.filter(a => showHidden ? true : a.isActive);
  const hiddenCount = announcements.filter(a => !a.isActive).length;

  // ── Text color helpers ──
  const titleColor   = isLightMode ? '#111827' : '#ffffff';       // ← white in dark mode
  const messageColor = isLightMode ? '#1f2937' : '#e5e7eb';       // ← light gray in dark mode
  const metaColor    = isLightMode ? '#374151' : '#9ca3af';       // ← muted in dark mode
  const iconColor    = isLightMode ? '#5b21b6' : '#a78bfa';       // ← violet in dark mode

  // ── Card styles ──
  const cardBg     = isLightMode ? undefined : 'rgba(255,255,255,0.06)';      // ← brighter card in dark
  const cardBorder = isLightMode ? undefined : 'rgba(255,255,255,0.12)';      // ← visible border in dark

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Megaphone className="w-7 h-7 text-violet-400" />
            <h1 className="text-3xl font-bold text-app-primary">Announcements</h1>
          </div>
          <p className="text-app-secondary text-sm ml-10">Post announcements that students will see on the mobile app.</p>
        </div>
        <div className="flex items-center gap-2">
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowHidden(!showHidden)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                showHidden
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                  : 'border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Filter size={14} />
              {showHidden ? 'Showing All' : `Show Hidden (${hiddenCount})`}
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <Plus size={16} /> New Announcement
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{
            borderColor: 'rgba(109,40,217,0.3)',
            background: isLightMode ? 'rgba(237,233,254,0.5)' : 'rgba(109,40,217,0.08)',
          }}
        >
          <p className="font-semibold text-sm" style={{ color: titleColor }}>New Announcement</p>
          <input
            type="text"
            placeholder="Title (e.g. No Classes on Friday)"
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 border"
            style={{
              background: isLightMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.07)',
              borderColor: isLightMode ? 'rgba(196,181,253,0.6)' : 'rgba(255,255,255,0.15)',
              color: isLightMode ? '#111827' : '#ffffff',
            }}
            value={newForm.title}
            onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
          />
          <textarea
            placeholder="Write your announcement message here..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 border resize-none"
            style={{
              background: isLightMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.07)',
              borderColor: isLightMode ? 'rgba(196,181,253,0.6)' : 'rgba(255,255,255,0.15)',
              color: isLightMode ? '#111827' : '#ffffff',
            }}
            value={newForm.message}
            onChange={(e) => setNewForm({ ...newForm, message: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
            >
              <Check size={14} /> {saving ? 'Posting...' : 'Post Announcement'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewForm({ title: '', message: '' }); }}
              className="px-4 py-2 text-sm rounded-lg hover:bg-white/10"
              style={{ color: isLightMode ? '#374151' : '#d1d5db' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
        </div>
      ) : visibleAnnouncements.length === 0 ? (
        <div className="bg-card rounded-xl border p-16 flex flex-col items-center gap-3" style={{ borderColor: 'var(--card-border)' }}>
          <Megaphone className="w-12 h-12 text-gray-600" />
          <p className="text-app-primary font-semibold">No announcements yet</p>
          <p className="text-app-secondary text-sm">Click "New Announcement" to post one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAnnouncements.map((a) => (
            <div
              key={a._id}
              className="rounded-xl border p-5"
              style={{
                background: isLightMode ? 'var(--card-bg)' : cardBg,
                borderColor: a.isActive
                  ? 'rgba(109,40,217,0.35)'
                  : isLightMode ? 'var(--card-border)' : cardBorder,
                opacity: a.isActive ? 1 : 0.6,
              }}
            >
              {editingId === a._id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 border"
                    style={{
                      background: isLightMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.07)',
                      borderColor: isLightMode ? 'rgba(196,181,253,0.6)' : 'rgba(255,255,255,0.15)',
                      color: isLightMode ? '#111827' : '#ffffff',
                    }}
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 border resize-none"
                    style={{
                      background: isLightMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.07)',
                      borderColor: isLightMode ? 'rgba(196,181,253,0.6)' : 'rgba(255,255,255,0.15)',
                      color: isLightMode ? '#111827' : '#ffffff',
                    }}
                    value={editForm.message}
                    onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(a._id)} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs hover:opacity-90 disabled:opacity-50">
                      <Check size={12} /> Save
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs rounded-lg hover:bg-white/10"
                      style={{ color: isLightMode ? '#374151' : '#d1d5db' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Icon */}
                    <div
                      className="p-2 rounded-lg shrink-0 mt-0.5"
                      style={{ background: a.isActive ? 'rgba(109,40,217,0.18)' : 'rgba(107,114,128,0.15)' }}
                    >
                      <Megaphone
                        size={16}
                        style={{ color: a.isActive ? iconColor : (isLightMode ? '#6b7280' : '#9ca3af') }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title + Live/Hidden badge */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-bold text-sm" style={{ color: titleColor }}>
                          {a.title}
                        </p>
                        {a.isActive ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Live</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-500/15 border border-gray-500/30" style={{ color: isLightMode ? '#374151' : '#9ca3af' }}>Hidden</span>
                        )}
                      </div>

                      {/* Message */}
                      <p className="text-sm leading-relaxed" style={{ color: messageColor }}>
                        {a.message}
                      </p>

                      {/* Posted by / date */}
                      <p className="text-xs mt-2 font-medium" style={{ color: metaColor }}>
                        Posted by {a.createdBy?.name} · {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons — only shown if admin or owner */}
                  {canModify(a) && (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleToggleActive(a)} title={a.isActive ? 'Hide from students' : 'Show to students'}
                        className={`p-1.5 rounded-lg border transition-all ${a.isActive ? 'text-emerald-400 hover:text-white hover:bg-emerald-500 border-emerald-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-500 border-gray-500/30'}`}>
                        {a.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button onClick={() => handleStartEdit(a)}
                        className="p-1.5 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500 border border-blue-500/30 transition-all">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(a._id)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;