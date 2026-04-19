import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Trash2, CheckCheck, ExternalLink } from 'lucide-react';
import { notificationsAPI, userAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TYPE_CONFIG = {
  new_feedback:     { icon: '📋', bg: 'rgba(124,58,237,0.15)',  border: 'rgba(124,58,237,0.3)'  },
  student_reply:    { icon: '💬', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)'  },
  overdue_feedback: { icon: '⚠️', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)'  },
  status_changed:   { icon: '🔄', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)'  },
  // ── NEW: new user registered ──
  new_user:         { icon: '👤', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)'   },
};

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ── Same localStorage key used by Students.jsx & Sidebar.jsx ──
const VIEWED_NEW_USERS_KEY = 'viewedNewUserIds';
const getViewedNewUserIds = () => {
  try { return new Set(JSON.parse(localStorage.getItem(VIEWED_NEW_USERS_KEY) || '[]')); }
  catch { return new Set(); }
};
const markUserAsViewed = (id) => {
  try {
    const viewed = getViewedNewUserIds();
    viewed.add(id);
    localStorage.setItem(VIEWED_NEW_USERS_KEY, JSON.stringify([...viewed]));
    window.dispatchEvent(new Event('newUserViewed'));
  } catch {}
};
const markAllUsersAsViewed = (ids) => {
  try {
    const viewed = getViewedNewUserIds();
    ids.forEach(id => viewed.add(id));
    localStorage.setItem(VIEWED_NEW_USERS_KEY, JSON.stringify([...viewed]));
    window.dispatchEvent(new Event('newUserViewed'));
  } catch {}
};

const NotificationBell = ({ isLightMode, feedbackCount = 0 }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // ── NEW: synthetic new-user notifications ──
  const [newUserNotifs, setNewUserNotifs] = useState([]);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Fetch new-user notifications (users registered in last 24h, not yet viewed) ──
  const fetchNewUserNotifs = useCallback(async () => {
    // Only admins see new-user notifications
    if (user?.role !== 'admin') return;
    try {
      const [studentsRes, staffRes, adminRes] = await Promise.all([
        userAPI.getAll({ role: 'student' }),
        userAPI.getAll({ role: 'staff' }),
        userAPI.getAll({ role: 'admin' }),
      ]);
      const all = [
        ...(studentsRes.data.users || []).map(u => ({ ...u, role: 'student' })),
        ...(staffRes.data.users   || []).map(u => ({ ...u, role: 'staff'   })),
        ...(adminRes.data.users   || []).map(u => ({ ...u, role: 'admin'   })),
      ];
      const viewed = getViewedNewUserIds();
      const now = new Date();
      const unviewed = all.filter(u => {
        if (!u.createdAt) return false;
        const hoursDiff = (now - new Date(u.createdAt)) / (1000 * 60 * 60);
        return hoursDiff <= 24 && !viewed.has(u._id);
      });

      // Shape them like notification objects so the list renders uniformly
      setNewUserNotifs(unviewed.map(u => ({
        _id:        `new_user_${u._id}`,   // synthetic id
        userId:     u._id,
        type:       'new_user',
        title:      'New user registered',
        message:    `${u.name} joined as ${u.role}`,
        createdAt:  u.createdAt,
        isReadByMe: false,                 // always unread until dismissed
      })));
    } catch {}
  }, [user?.role]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsAPI.getAll();
      const allNotifs = res.data.notifications || [];
      const visible = allNotifs.filter(n =>
        n.type !== 'student_reply' &&
        !(n.type === 'status_changed' && user?.role !== 'admin')
      );
      setNotifications(allNotifs);
      setUnreadCount(visible.filter(n => !n.isReadByMe).length);
    } catch {}
  }, [user?.role]);

  useEffect(() => {
    fetchNotifications();
    fetchNewUserNotifs();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchNewUserNotifs();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchNewUserNotifs]);

  // Re-fetch new-user notifs when Students.jsx marks someone as viewed
  useEffect(() => {
    window.addEventListener('newUserViewed', fetchNewUserNotifs);
    return () => window.removeEventListener('newUserViewed', fetchNewUserNotifs);
  }, [fetchNewUserNotifs]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onModalChange = (e) => {
      setFeedbackModalOpen(e.detail?.open ?? false);
      if (e.detail?.open) setOpen(false);
    };
    window.addEventListener('feedbackModalOpen', onModalChange);
    return () => window.removeEventListener('feedbackModalOpen', onModalChange);
  }, []);

 const handleOpen = () => {
  setOpen(prev => !prev);
};

  const handleDelete = async (e, notif) => {
    e.stopPropagation();
    if (notif.type === 'new_user') {
      // Mark as viewed in localStorage so it disappears everywhere
      markUserAsViewed(notif.userId);
      setNewUserNotifs(prev => prev.filter(n => n._id !== notif._id));
      return;
    }
    try {
      await notificationsAPI.deleteOne(notif._id);
      setNotifications(prev => prev.filter(n => n._id !== notif._id));
    } catch {}
  };

  const handleClearAll = async () => {
    // Clear regular notifications
    try {
      await notificationsAPI.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
    // Also dismiss all new-user notifs
    if (newUserNotifs.length > 0) {
      markAllUsersAsViewed(newUserNotifs.map(n => n.userId));
      setNewUserNotifs([]);
    }
  };

  const handleClickNotification = async (notif) => {
    if (notif.type === 'new_user') {
      // Mark this user as viewed and navigate to Manage Users
      markUserAsViewed(notif.userId);
      setNewUserNotifs(prev => prev.filter(n => n._id !== notif._id));
      setOpen(false);
      navigate('/students');
      return;
    }

    if (!notif.isReadByMe) {
      try {
        await notificationsAPI.markRead(notif._id);
        setNotifications(prev =>
          prev.map(n => n._id === notif._id ? { ...n, isReadByMe: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }

    setOpen(false);

    if (notif.type === 'student_reply' && notif.feedbackId) {
      navigate(`/feedback/${notif.feedbackId}/chat`);
    } else if (notif.feedbackId) {
      navigate(`/feedback?open=${notif.feedbackId}`);
    }
  };

  const textPrimary   = isLightMode ? '#1e1b4b' : '#ffffff';
  const textSecondary = isLightMode ? '#6b7280' : '#9ca3af';
  const hoverBg       = isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.05)';
  const panelBg       = isLightMode ? 'rgba(255,255,255,0.98)' : 'linear-gradient(145deg,#1a1025,#0f0a1a)';
  const panelBorder   = isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,255,255,0.12)';

  // ── Merge new-user notifs (on top) with regular filtered notifs ──
  const filteredRegular = notifications.filter(n =>
    n.type !== 'student_reply' &&
    !(n.type === 'status_changed' && user?.role !== 'admin')
  );
  const allVisible = [...newUserNotifs, ...filteredRegular];

  // ── Total bell badge: regular unread + unviewed new users ──
  const totalUnread = unreadCount + newUserNotifs.length;

  if (feedbackModalOpen) return null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>

      {/* ── Bell Button ── */}
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          width: '34px',
          height: '34px',
          borderRadius: '9px',
          background: open
            ? 'linear-gradient(135deg,rgba(124,58,237,0.35),rgba(219,39,119,0.2))'
            : isLightMode
              ? 'rgba(124,58,237,0.15)'
              : 'rgba(124,58,237,0.12)',
          border: open
            ? '1.5px solid rgba(124,58,237,0.55)'
            : isLightMode
              ? '1.5px solid rgba(109,40,217,0.5)'
              : '1px solid rgba(124,58,237,0.35)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        <Bell style={{
          width: '15px',
          height: '15px',
          color: open
            ? '#a78bfa'
            : isLightMode
              ? '#7c3aed'
              : 'rgba(200,190,240,0.7)',
          transition: 'color 0.2s',
        }} />
        {/* Badge shows total: support unread (feedbackCount) + new users */}
        {(unreadCount + newUserNotifs.length) > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            minWidth: '16px',
            height: '16px',
            borderRadius: '999px',
            background: 'linear-gradient(135deg,#ef4444,#dc2626)',
            border: isLightMode ? '2px solid #ffffff' : '2px solid #0f0a1e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            fontWeight: 700,
            color: '#fff',
            padding: '0 3px',
            fontFamily: "'DM Mono', monospace",
          }}>
           {(unreadCount + newUserNotifs.length) > 99 ? '99+' : (unreadCount + newUserNotifs.length)}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: '0',
          width: '360px',
          maxHeight: '480px',
          borderRadius: '16px',
          background: panelBg,
          border: panelBorder,
          boxShadow: isLightMode
            ? '0 20px 60px rgba(109,40,217,0.15)'
            : '0 20px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(124,58,237,0.2)',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: isLightMode
              ? '1px solid rgba(196,181,253,0.3)'
              : '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell style={{ width: '14px', height: '14px', color: '#7c3aed' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: textPrimary, fontFamily: "'DM Sans',sans-serif" }}>
                Notifications
              </span>
              {totalUnread > 0 && (
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#fff',
                  background: 'linear-gradient(135deg,#7c3aed,#db2777)',
                  padding: '1px 7px',
                  borderRadius: '999px',
                  fontFamily: "'DM Mono',monospace",
                }}>
                  {totalUnread} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {allVisible.length > 0 && (
                <button
                  onClick={handleClearAll}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', color: textSecondary,
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px 8px', borderRadius: '6px',
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Trash2 style={{ width: '11px', height: '11px' }} />
                  Clear all
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: '26px', height: '26px', borderRadius: '6px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: textSecondary,
                }}
                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <X style={{ width: '13px', height: '13px' }} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {allVisible.length === 0 ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '13px',
                  background: isLightMode ? 'rgba(109,40,217,0.08)' : 'rgba(255,255,255,0.05)',
                  border: isLightMode ? '1px solid rgba(196,181,253,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bell style={{ width: '19px', height: '19px', color: '#6b7280' }} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, margin: 0, fontFamily: "'DM Sans',sans-serif" }}>
                  All caught up!
                </p>
                <p style={{ fontSize: '12px', color: textSecondary, margin: 0 }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              allVisible.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.new_feedback;
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleClickNotification(notif)}
                    style={{
                      padding: '11px 14px',
                      borderBottom: isLightMode
                        ? '1px solid rgba(196,181,253,0.12)'
                        : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      background: notif.isReadByMe
                        ? 'transparent'
                        : isLightMode ? 'rgba(109,40,217,0.04)' : 'rgba(124,58,237,0.07)',
                      position: 'relative',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                    onMouseLeave={e => e.currentTarget.style.background = notif.isReadByMe
                      ? 'transparent'
                      : isLightMode ? 'rgba(109,40,217,0.04)' : 'rgba(124,58,237,0.07)'
                    }
                  >
                    {/* Unread dot */}
                    {!notif.isReadByMe && (
                      <div style={{
                        position: 'absolute', left: '5px', top: '50%',
                        transform: 'translateY(-50%)',
                        width: '4px', height: '4px',
                        borderRadius: '50%', background: '#7c3aed', flexShrink: 0,
                      }} />
                    )}

                    {/* Icon */}
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '9px',
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', flexShrink: 0,
                    }}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '12px',
                        fontWeight: notif.isReadByMe ? 500 : 700,
                        color: textPrimary, margin: '0 0 2px',
                        lineHeight: 1.4, fontFamily: "'DM Sans',sans-serif",
                      }}>
                        {notif.title}
                      </p>
                      <p style={{
                        fontSize: '11px', color: textSecondary,
                        margin: '0 0 4px', lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {notif.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', color: textSecondary }}>
                          {timeAgo(notif.createdAt)}
                        </span>
                        {/* Navigate hint */}
                        {notif.type === 'new_user' && (
                          <span style={{
                            fontSize: '10px', color: '#ef4444',
                            display: 'flex', alignItems: 'center', gap: '2px',
                          }}>
                            <ExternalLink style={{ width: '9px', height: '9px' }} />
                            View in Manage Users
                          </span>
                        )}
                        {notif.feedbackId && (
                          <span style={{
                            fontSize: '10px', color: '#7c3aed',
                            display: 'flex', alignItems: 'center', gap: '2px',
                          }}>
                            <ExternalLink style={{ width: '9px', height: '9px' }} />
                            View feedback
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete / dismiss */}
                    <button
                      onClick={(e) => handleDelete(e, notif)}
                      style={{
                        width: '22px', height: '22px', borderRadius: '5px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: textSecondary, flexShrink: 0, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.color = textSecondary;
                      }}
                    >
                      <X style={{ width: '11px', height: '11px' }} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {allVisible.length > 0 && (
            <div style={{
              padding: '10px 14px',
              borderTop: isLightMode
                ? '1px solid rgba(196,181,253,0.3)'
                : '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'center', flexShrink: 0,
            }}>
              <button
                onClick={async () => {
                  await notificationsAPI.markAllRead();
                  setNotifications(prev => prev.map(n => ({ ...n, isReadByMe: true })));
                  setUnreadCount(0);
                  // Also dismiss all new-user notifs
                  if (newUserNotifs.length > 0) {
                    markAllUsersAsViewed(newUserNotifs.map(n => n.userId));
                    setNewUserNotifs([]);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, color: '#7c3aed',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 10px', borderRadius: '6px',
                  fontFamily: "'DM Sans',sans-serif",
                }}
                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <CheckCheck style={{ width: '12px', height: '12px' }} />
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;