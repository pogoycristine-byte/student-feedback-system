import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Users,
  BarChart2,
  Settings,
  LogOut,
  ClipboardList,
  CalendarClock,
  Sun,
  Moon,
  Megaphone,
  LifeBuoy,
  MessagesSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import lasLogo from '../las.png';
import { feedbackAPI, messagesAPI, supportAPI, userAPI } from '../services/api';
import { getSchedules } from '../utils/scheduleHelpers';
import NotificationBell from './NotificationBell';

/* ─── Google Fonts injection ─────────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap';
if (!document.head.querySelector('[href*="DM+Serif"]')) {
  document.head.appendChild(fontLink);
}

/* ─── Palette ───────────────────────────────────────────────────────────── */
const C = {
  bg: '#1a1333',
  surface: '#221a42',
  border: 'rgba(255,255,255,0.08)',
  accent: '#7C3AED',
  accentBright: '#a78bfa',
  accentMuted: 'rgba(124,58,237,0.18)',
  accentHover: 'rgba(255,255,255,0.07)',
  text: '#f1eeff',
  muted: 'rgba(200,190,240,0.45)',
  subtle: 'rgba(200,190,240,0.70)',
  danger: '#f87171',
  dangerMuted: 'rgba(248,113,113,0.12)',
  warn: '#fbbf24',
  warnMuted: 'rgba(251,191,36,0.13)',
};

/* ─── Inline global styles ───────────────────────────────────────────────── */
const injectStyles = () => {
  if (document.getElementById('sidebar-formal-styles')) return;
  const style = document.createElement('style');
  style.id = 'sidebar-formal-styles';
  style.textContent = `
    .sb-nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      border-radius: 8px;
      padding: 7px 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.01em;
      color: ${C.subtle};
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
      position: relative;
    }
    .sb-nav-link:hover {
      background: ${C.accentHover};
      color: ${C.text};
    }
    .sb-nav-link.active {
      background: linear-gradient(90deg, rgba(124,58,237,0.55), rgba(167,139,250,0.20));
      color: #fff;
      box-shadow: inset 0 0 0 1px rgba(167,139,250,0.20);
    }
    .sb-icon {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      opacity: 0.65;
    }
    .sb-nav-link.active .sb-icon {
      opacity: 1;
    }
    .sb-badge-red {
      background: ${C.danger};
      color: #fff;
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      font-weight: 600;
      border-radius: 99px;
      padding: 1px 6px;
      letter-spacing: 0.04em;
    }
    .sb-badge-warn {
      background: ${C.warnMuted};
      color: ${C.warn};
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      font-weight: 600;
      border-radius: 99px;
      padding: 1px 6px;
      letter-spacing: 0.04em;
    }
    .sb-footer-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      border-radius: 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 7px 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
    }
    .sb-footer-btn:hover { background: ${C.accentHover}; }
    .sb-divider {
      border: none;
      border-top: 1px solid ${C.border};
      margin: 6px 0;
    }
    .sb-scrollbar::-webkit-scrollbar { width: 3px; }
    .sb-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .sb-scrollbar::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.2); border-radius: 99px; }
  `;
  document.head.appendChild(style);
};
injectStyles();

/* ─── Persistence helpers (feedback chat — unchanged) ────────────────────── */
const DISMISSED_KEY = 'dismissedNewFeedback';
const getDismissedKey = (userId) => `${DISMISSED_KEY}_${userId}`;
const getDismissed = (userId) => {
  try { return new Set(JSON.parse(localStorage.getItem(getDismissedKey(userId)) || '[]')); }
  catch { return new Set(); }
};

const LAST_READ_KEY = 'adminLastReadMsgId';
export const getLastRead = () => {
  try { return JSON.parse(localStorage.getItem(LAST_READ_KEY) || '{}'); }
  catch { return {}; }
};
export const markChatAsRead = (feedbackId, lastMessageId) => {
  const map = getLastRead();
  map[feedbackId] = lastMessageId;
  localStorage.setItem(LAST_READ_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event('adminReadChat'));
};

// ── Support read tracking ─────────────────────────────────────────────────
const SUPPORT_LAST_READ_KEY = 'adminLastReadSupportMsgId';
export const getSupportLastRead = () => {
  try { return JSON.parse(localStorage.getItem(SUPPORT_LAST_READ_KEY) || '{}'); }
  catch { return {}; }
};
export const markSupportAsRead = (threadId, lastMessageId) => {
  const map = getSupportLastRead();
  map[threadId] = lastMessageId;
  localStorage.setItem(SUPPORT_LAST_READ_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event('adminReadSupport'));
};

// Kept as no-ops so existing imports don't break
export const getDmLastRead = () => ({});
export const markDmAsRead  = () => {};

// ── New-user viewed tracking (mirrors Students.jsx localStorage key) ───────
const VIEWED_NEW_USERS_KEY = 'viewedNewUserIds';
const getViewedNewUserIds = () => {
  try { return new Set(JSON.parse(localStorage.getItem(VIEWED_NEW_USERS_KEY) || '[]')); }
  catch { return new Set(); }
};

const getDueStatus = (item) => {
  if (item.status === 'Resolved' || item.status === 'Rejected') return null;
  const due = new Date(item.createdAt);
  due.setDate(due.getDate() + 5);
  const now = new Date();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  if (now > due) return 'overdue';
  if (diffDays <= 1) return 'due-today';
  return null;
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */
const SectionLabel = ({ label }) => (
  <div style={{
    fontFamily: "'DM Mono', monospace",
    fontSize: '9px',
    fontWeight: 500,
    letterSpacing: '0.13em',
    textTransform: 'uppercase',
    color: C.muted,
    padding: '14px 10px 4px',
  }}>
    {label}
  </div>
);

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <img
      src={lasLogo}
      alt="ClassBack Logo"
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        objectFit: 'contain',
        flexShrink: 0,
        border: '2px solid rgba(167,139,250,0.35)',
        background: 'rgba(255,255,255,0.06)',
        boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
      }}
    />
    <div style={{ lineHeight: 1.25 }}>
      <span style={{
        display: 'block',
        fontFamily: "'DM Serif Display', serif",
        fontSize: '19px',
        fontWeight: 400,
        background: 'linear-gradient(90deg, #c4b5fd, #f9a8d4)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '-0.2px',
      }}>
        ClassBack
      </span>
      <span style={{
        display: 'block',
        fontFamily: "'DM Mono', monospace",
        fontSize: '9px',
        color: C.muted,
        fontWeight: 400,
        letterSpacing: '0.04em',
        marginTop: '2px',
      }}>
        Feedback &amp; Suggestion
      </span>
    </div>
  </div>
);

const Toggle = ({ on }) => (
  <div style={{
    marginLeft: 'auto',
    width: '28px',
    height: '15px',
    borderRadius: '99px',
    background: on ? '#7C3AED' : 'rgba(255,255,255,0.15)',
    position: 'relative',
    flexShrink: 0,
    transition: 'background 0.2s',
  }}>
    <div style={{
      position: 'absolute',
      top: '2px',
      left: on ? '14px' : '2px',
      width: '11px',
      height: '11px',
      borderRadius: '50%',
      background: '#fff',
      transition: 'left 0.2s',
    }} />
  </div>
);

/* ─── Main Sidebar ───────────────────────────────────────────────────────── */
const Sidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const userId = String(user?.id || user?._id || '');

  const [newFeedbackCount, setNewFeedbackCount]     = useState(0);
  const [unreadChatCount, setUnreadChatCount]       = useState(0);
  const [dueSoonCount, setDueSoonCount]             = useState(0);
  const [overdueCount, setOverdueCount]             = useState(0);
  const [unreadDmCount, setUnreadDmCount]           = useState(0);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  // ── NEW: count of newly registered users not yet viewed by admin ──
  const [newUsersCount, setNewUsersCount]           = useState(0);

  const isAdmin = user?.role === 'admin';
  const [lightMode, setLightMode] = useState(
    () => document.documentElement.classList.contains('light-mode') || document.body.classList.contains('light-mode')
  );

  const toggleTheme = () => {
    const next = !lightMode;
    setLightMode(next);
    if (next) {
      document.documentElement.classList.add('light-mode');
      document.body.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.body.classList.remove('light-mode');
    }
    localStorage.setItem('themeMode', next ? 'light' : 'dark');
  };

  const computeScheduleBadge = () => {
    const schedules = getSchedules();
    const now = new Date();
    const count = schedules.filter(s => {
      const diff = (new Date(s.date) - now) / (1000 * 60 * 60 * 24);
      return diff <= 1;
    }).length;
    setDueSoonCount(count);
  };

  const computeDmCount = async () => {
    if (!userRef.current?.name) return;
    try {
      const res     = await messagesAPI.getThreads();
      const threads = res.data.threads || [];
      const count   = threads.filter(t => t.isUnread).length;
      setUnreadDmCount(count);
    } catch {}
  };

  const computeSupportCount = async () => {
    try {
      const res     = await supportAPI.getThreads();
      const threads = res.data.threads || [];
      const lastRead = getSupportLastRead();

      const count = threads.filter(t => {
        if (t.status === 'Resolved' || t.status === 'Closed') return false;
        if (!t.isUnread) return false;
        // If we've locally marked this thread's last message as read, don't count it
        const lastMsgId = t.lastMessage?._id || t.lastMessage;
        if (!lastMsgId) return false;
        return lastRead[String(t._id)] !== String(lastMsgId);
      }).length;

      setUnreadSupportCount(count);
    } catch {}
  };

  // ── NEW: compute how many users registered in the last 24h haven't been viewed ──
  const computeNewUsersCount = async () => {
    try {
      const [studentsRes, staffRes, adminRes] = await Promise.all([
        userAPI.getAll({ role: 'student' }),
        userAPI.getAll({ role: 'staff' }),
        userAPI.getAll({ role: 'admin' }),
      ]);
      const all = [
        ...(studentsRes.data.users || []),
        ...(staffRes.data.users   || []),
        ...(adminRes.data.users   || []),
      ];
      const viewed = getViewedNewUserIds();
      const now = new Date();
      const count = all.filter(u => {
        if (!u.createdAt) return false;
        const hoursDiff = (now - new Date(u.createdAt)) / (1000 * 60 * 60);
        return hoursDiff <= 24 && !viewed.has(u._id);
      }).length;
      setNewUsersCount(count);
    } catch {}
  };

  const computeCounts = async () => {
    try {
      const response    = await feedbackAPI.getAll({});
      const allFeedback = response.data.feedback || [];
      const dismissed   = getDismissed(userId);
      const lastRead    = getLastRead();
      const now         = new Date();

      const newCount = allFeedback.filter(item => {
        if (dismissed.has(item._id)) return false;
        const hoursDiff = (now - new Date(item.createdAt)) / (1000 * 60 * 60);
        return hoursDiff <= 24;
      }).length;

      let unreadCount = 0;
      await Promise.all(
        allFeedback.map(async (item) => {
          try {
            const msgRes   = await feedbackAPI.getMessages(item._id);
            const messages = msgRes.data.messages || [];
            if (messages.length === 0) return;
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.senderRole === 'student' && lastRead[item._id] !== lastMsg._id) {
              unreadCount++;
            }
          } catch {}
        })
      );

      const urgentCount = allFeedback.filter(item => {
        const status = getDueStatus(item);
        return status === 'overdue' || status === 'due-today';
      }).length;

      setNewFeedbackCount(newCount);
      setUnreadChatCount(unreadCount);
      setOverdueCount(urgentCount);
    } catch (error) {
      console.error('Sidebar count error:', error);
    }
  };

  // ── Effect 1: polling + event listeners (registered once) ──
  useEffect(() => {
    const interval = setInterval(() => {
      computeCounts();
      computeScheduleBadge();
      computeDmCount();
      computeSupportCount();
      computeNewUsersCount();
    }, 15000);

    window.addEventListener('feedbackDismissed',  computeCounts);
    window.addEventListener('adminReadChat',       computeCounts);
    window.addEventListener('schedulesUpdated',    computeScheduleBadge);
    window.addEventListener('adminReadDm',         computeDmCount);
    window.addEventListener('dmSent',              computeDmCount);
    window.addEventListener('newDmReceived',       computeDmCount);
    window.addEventListener('adminReadSupport',    computeSupportCount);
    window.addEventListener('newSupportMessage',   computeSupportCount);
    // ── NEW: re-count when admin views a user (Students.jsx updates localStorage) ──
    window.addEventListener('newUserViewed',       computeNewUsersCount);

    return () => {
      clearInterval(interval);
      window.removeEventListener('feedbackDismissed',  computeCounts);
      window.removeEventListener('adminReadChat',       computeCounts);
      window.removeEventListener('schedulesUpdated',    computeScheduleBadge);
      window.removeEventListener('adminReadDm',         computeDmCount);
      window.removeEventListener('dmSent',              computeDmCount);
      window.removeEventListener('newDmReceived',       computeDmCount);
      window.removeEventListener('adminReadSupport',    computeSupportCount);
      window.removeEventListener('newSupportMessage',   computeSupportCount);
      window.removeEventListener('newUserViewed',       computeNewUsersCount);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: initial load once userId is known ──
  useEffect(() => {
    if (!userId) return;
    computeCounts();
    computeScheduleBadge();
    computeDmCount();
    computeSupportCount();
    computeNewUsersCount();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalBadge = newFeedbackCount + unreadChatCount;

  const adminGroups = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard',     path: '/dashboard',     icon: LayoutDashboard },
        { name: 'Announcements', path: '/announcements', icon: Megaphone },
        { name: 'Messages',      path: '/messages',      icon: MessagesSquare, badge: unreadDmCount },
      ],
    },
    {
      label: 'Management',
      items: [
        { name: 'Manage Feedback',   path: '/feedback',        icon: MessageSquare, badge: totalBadge, overdueBadge: overdueCount },
        { name: 'Support Tickets',   path: '/support-tickets', icon: LifeBuoy,      badge: unreadSupportCount },
        { name: 'Manage Categories', path: '/categories',      icon: FolderOpen },
        { name: 'Manage Users',      path: '/students',        icon: Users,         badge: newUsersCount },
      ],
    },
    {
      label: 'Reports',
      items: [
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart2 },
      ],
    },
    {
      label: 'Settings',
      items: [
        { name: 'System Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  const staffGroups = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard',     path: '/dashboard',     icon: LayoutDashboard },
        { name: 'Announcements', path: '/announcements', icon: Megaphone },
        { name: 'Messages',      path: '/messages',      icon: MessagesSquare, badge: unreadDmCount },
      ],
    },
    {
      label: 'Feedback',
      items: [
        { name: 'Feedback',        path: '/feedback',        icon: MessageSquare, badge: totalBadge, overdueBadge: overdueCount },
        { name: 'Manage Feedback', path: '/staff/manage',    icon: ClipboardList },
        { name: 'Support Tickets', path: '/support-tickets', icon: LifeBuoy,      badge: unreadSupportCount }, // ── added for staff coverage ──
      ],
    },
    {
      label: 'Schedule',
      items: [
        { name: 'My Schedules', path: '/schedules', icon: CalendarClock, badge: dueSoonCount },
      ],
    },
    {
      label: 'Settings',
      items: [
        { name: 'Settings', path: '/staff/settings', icon: Settings },
      ],
    },
  ];

  const groups = isAdmin ? adminGroups : staffGroups;

  const renderItem = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => `sb-nav-link${isActive ? ' active' : ''}`}
      >
        <Icon className="sb-icon" />
        <span>{item.name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {item.overdueBadge > 0 && (
            <span className="sb-badge-warn" title={`${item.overdueBadge} overdue or due today`}>
              {item.overdueBadge}⚠
            </span>
          )}
          {item.badge > 0 && (
            <span className="sb-badge-red">{item.badge}</span>
          )}
        </div>
      </NavLink>
    );
  };

  return (
    <div
      style={{
        width: '240px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'linear-gradient(180deg, #0f0a1e 0%, #130d28 40%, #1e1040 65%, #3a1260 82%, #5a1458 92%, #7a1560 100%)',
        borderRight: '1px solid rgba(167,139,250,0.12)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid rgba(167,139,250,0.12)',
      }}>
        <Logo />
        <div style={{ borderTop: '1px solid rgba(167,139,250,0.12)', margin: '14px 0 10px' }} />

        {/* ── User info row with inline NotificationBell ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '9px',
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: C.muted,
              marginBottom: '4px',
            }}>
              {isAdmin ? 'Admin Panel' : 'Staff Panel'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                color: C.text,
              }}>
                {user?.name}
              </span>
              {user?.role && !isAdmin && (
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '9px',
                  color: '#c4b5fd',
                  background: 'rgba(124,58,237,0.25)',
                  border: '1px solid rgba(167,139,250,0.30)',
                  borderRadius: '3px',
                  padding: '1px 6px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  {user.role}
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: '6px' }}>
            <NotificationBell isLightMode={lightMode} feedbackCount={unreadSupportCount} />
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="sb-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
        {groups.map((group) => (
          <div key={group.label}>
            <SectionLabel label={group.label} />
            {group.items.map((item) => renderItem(item))}
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div style={{
        padding: '8px',
        borderTop: '1px solid rgba(167,139,250,0.12)',
      }}>
        {!isAdmin && (
          <>
            <button
              onClick={toggleTheme}
              className="sb-footer-btn"
              style={{ color: C.subtle }}
            >
              {lightMode
                ? <Sun style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                : <Moon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
              }
              <span>{lightMode ? 'Light Mode' : 'Dark Mode'}</span>
              <Toggle on={lightMode} />
            </button>
            <hr className="sb-divider" />
          </>
        )}
        <button
          onClick={logout}
          className="sb-footer-btn"
          style={{ color: C.danger }}
        >
          <LogOut style={{ width: '14px', height: '14px', flexShrink: 0 }} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;