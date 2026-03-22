import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Pencil, Check, X, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', message: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements/all');
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
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-card rounded-xl border p-5 space-y-3" style={{ borderColor: 'rgba(109,40,217,0.3)', background: 'rgba(109,40,217,0.05)' }}>
          <p className="text-app-primary font-semibold text-sm">New Announcement</p>
          <input
            type="text"
            placeholder="Title (e.g. No Classes on Friday)"
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-input border text-app-primary placeholder-gray-500"
            value={newForm.title}
            onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
          />
          <textarea
            placeholder="Write your announcement message here..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-input border text-app-primary placeholder-gray-500 resize-none"
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
              className="px-4 py-2 text-app-secondary text-sm rounded-lg hover:bg-white/10"
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
      ) : announcements.length === 0 ? (
        <div className="bg-card rounded-xl border p-16 flex flex-col items-center gap-3" style={{ borderColor: 'var(--card-border)' }}>
          <Megaphone className="w-12 h-12 text-gray-600" />
          <p className="text-app-primary font-semibold">No announcements yet</p>
          <p className="text-app-secondary text-sm">Click "New Announcement" to post one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a._id}
              className="bg-card rounded-xl border p-5"
              style={{
                borderColor: a.isActive ? 'rgba(109,40,217,0.25)' : 'var(--card-border)',
                opacity: a.isActive ? 1 : 0.6,
              }}
            >
              {editingId === a._id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-input border text-app-primary"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-input border text-app-primary resize-none"
                    value={editForm.message}
                    onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(a._id)} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs hover:opacity-90 disabled:opacity-50">
                      <Check size={12} /> Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-app-secondary text-xs rounded-lg hover:bg-white/10">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: a.isActive ? 'rgba(109,40,217,0.15)' : 'rgba(107,114,128,0.1)' }}>
                      <Megaphone size={16} className={a.isActive ? 'text-violet-400' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-app-primary font-semibold text-sm">{a.title}</p>
                        {a.isActive ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Live</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30">Hidden</span>
                        )}
                      </div>
                      <p className="text-app-secondary text-sm leading-relaxed">{a.message}</p>
                      <p className="text-app-tertiary text-xs mt-2">
                        Posted by {a.createdBy?.name} · {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
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