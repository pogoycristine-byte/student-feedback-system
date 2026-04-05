import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
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
  MessagesSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { feedbackAPI, messagesAPI } from '../services/api';
import { getSchedules } from '../utils/scheduleHelpers';

const DISMISSED_KEY = 'dismissedNewFeedback';
const getDismissed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')); }
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

// ── Direct-message read helpers ──────────────────────────────────────────────
const DM_LAST_READ_KEY = 'adminLastReadDmId';
export const getDmLastRead = () => {
  try { return JSON.parse(localStorage.getItem(DM_LAST_READ_KEY) || '{}'); }
  catch { return {}; }
};
export const markDmAsRead = (threadId, lastMessageId) => {
  const map = getDmLastRead();
  map[threadId] = lastMessageId;
  localStorage.setItem(DM_LAST_READ_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event('adminReadDm'));
};
// ─────────────────────────────────────────────────────────────────────────────

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

const SectionLabel = ({ label }) => (
  <p
    style={{
      color: 'rgba(255,255,255,0.38)',
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding: '8px 12px 2px',
    }}
  >
    {label}
  </p>
);

const Sidebar = () => {
  const { logout, user } = useAuth();
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [dueSoonCount, setDueSoonCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [unreadDmCount, setUnreadDmCount] = useState(0);

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

  // Works for both admin and staff — counts threads with unread messages from the other side
  const computeDmCount = async () => {
    try {
      const res = await messagesAPI.getThreads();
      const threads = res.data.threads || [];
      const lastRead = getDmLastRead();
      let count = 0;
      threads.forEach(thread => {
        const lastMsg = thread.lastMessage;
        if (!lastMsg) return;
        // Unread if last message was sent by the OTHER person and we haven't read it
        const sentByMe = lastMsg.senderName === user?.name;
        if (!sentByMe && lastRead[thread._id] !== lastMsg._id) {
          count++;
        }
      });
      setUnreadDmCount(count);
    } catch {
      // silently ignore
    }
  };

  const computeCounts = async () => {
    try {
      const response = await feedbackAPI.getAll({});
      const allFeedback = response.data.feedback || [];
      const dismissed = getDismissed();
      const lastRead = getLastRead();
      const now = new Date();

      const newCount = allFeedback.filter(item => {
        if (dismissed.has(item._id)) return false;
        const hoursDiff = (now - new Date(item.createdAt)) / (1000 * 60 * 60);
        return hoursDiff <= 24;
      }).length;

      let unreadCount = 0;
      await Promise.all(
        allFeedback.map(async (item) => {
          try {
            const msgRes = await feedbackAPI.getMessages(item._id);
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

  useEffect(() => {
    computeCounts();
    computeScheduleBadge();
    computeDmCount();

    const interval = setInterval(() => {
      computeCounts();
      computeScheduleBadge();
      computeDmCount();
    }, 30000);

    window.addEventListener('feedbackDismissed', computeCounts);
    window.addEventListener('adminReadChat', computeCounts);
    window.addEventListener('schedulesUpdated', computeScheduleBadge);
    window.addEventListener('adminReadDm', computeDmCount);
    window.addEventListener('dmSent', computeDmCount);

    return () => {
      clearInterval(interval);
      window.removeEventListener('feedbackDismissed', computeCounts);
      window.removeEventListener('adminReadChat', computeCounts);
      window.removeEventListener('schedulesUpdated', computeScheduleBadge);
      window.removeEventListener('adminReadDm', computeDmCount);
      window.removeEventListener('dmSent', computeDmCount);
    };
  }, []);

  const totalBadge = newFeedbackCount + unreadChatCount;

  const adminGroups = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Announcements', path: '/announcements', icon: Megaphone },
      ],
    },
    {
      label: 'Management',
      items: [
        { name: 'Manage Feedback', path: '/feedback', icon: MessageSquare, badge: totalBadge, overdueBadge: overdueCount },
        { name: 'Manage Categories', path: '/categories', icon: FolderOpen },
        { name: 'Manage Users', path: '/students', icon: Users },
      ],
    },
    {
      label: 'Communication',
      items: [
        { name: 'Messages', path: '/messages', icon: MessagesSquare, badge: unreadDmCount },
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
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Announcements', path: '/announcements', icon: Megaphone },
      ],
    },
    {
      label: 'Feedback',
      items: [
        { name: 'Feedback', path: '/feedback', icon: MessageSquare, badge: totalBadge, overdueBadge: overdueCount },
        { name: 'Manage Feedback', path: '/staff/manage', icon: ClipboardList },
      ],
    },
    {
      label: 'Schedule',
      items: [
        { name: 'My Schedules', path: '/schedules', icon: CalendarClock, badge: dueSoonCount },
      ],
    },
    {
      label: 'Communication',
      items: [
        { name: 'Messages', path: '/messages', icon: MessagesSquare, badge: unreadDmCount },
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
        className={({ isActive }) =>
          `flex items-center gap-2 rounded-md transition-all relative ${
            isActive
              ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white'
              : 'text-gray-400 hover:bg-white/10 hover:text-white'
          }`
        }
        style={{ padding: '6px 10px', fontSize: '13px' }}
      >
        <Icon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
        <span style={{ fontWeight: 500 }}>{item.name}</span>
        <div className="ml-auto flex items-center gap-1">
          {item.overdueBadge > 0 && (
            <span
              className="bg-orange-500 text-white font-bold rounded-full text-center"
              style={{ fontSize: '9px', padding: '1px 5px', minWidth: '16px' }}
              title={`${item.overdueBadge} overdue or due today`}
            >
              {item.overdueBadge}⚠
            </span>
          )}
          {item.badge > 0 && (
            <span
              className="bg-red-500 text-white font-bold rounded-full text-center"
              style={{ fontSize: '9px', padding: '1px 5px', minWidth: '16px' }}
            >
              {item.badge}
            </span>
          )}
        </div>
      </NavLink>
    );
  };

  return (
    <div
      className="w-64 backdrop-blur-lg flex flex-col h-screen"
      style={{
        isolation: 'isolate',
        background: lightMode ? 'rgba(100, 90, 130, 0.25)' : 'rgba(255,255,255,0.05)',
        borderRight: lightMode ? '1px solid rgba(100, 90, 130, 0.25)' : '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h1
          className="font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent"
          style={{ fontSize: '18px', lineHeight: 1.2 }}
        >
          {isAdmin ? 'Admin Panel' : 'Staff Panel'}
        </h1>
        <p className="text-gray-400 flex items-center gap-2" style={{ fontSize: '11px', marginTop: '4px' }}>
          {user?.name}
          {user?.role && (
            <span
              className="bg-violet-500/30 text-violet-300 rounded-full"
              style={{ fontSize: '9px', padding: '1px 7px' }}
            >
              {user?.role}
            </span>
          )}
        </p>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '4px 8px' }}>
        {groups.map((group) => (
          <div key={group.label} style={{ marginBottom: '4px' }}>
            <SectionLabel label={group.label} />
            {group.items.map((item) => renderItem(item))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {!isAdmin && (
          <>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-md w-full transition-all hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.85)', padding: '6px 10px', fontSize: '13px' }}
            >
              {lightMode
                ? <Sun style={{ width: '14px', height: '14px' }} />
                : <Moon style={{ width: '14px', height: '14px' }} />
              }
              <span style={{ fontWeight: 500 }}>{lightMode ? 'Light Mode' : 'Dark Mode'}</span>
              <div
                className="ml-auto rounded-full relative transition-all"
                style={{
                  width: '28px', height: '15px',
                  background: lightMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  flexShrink: 0,
                }}
              >
                <div
                  className="absolute rounded-full bg-white shadow transition-all"
                  style={{
                    top: '1.5px', width: '11px', height: '11px',
                    left: lightMode ? '14px' : '2px',
                  }}
                />
              </div>
            </button>
            <div className="border-t border-white/10 mx-1" style={{ margin: '4px 4px' }} />
          </>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-md text-red-400 hover:bg-red-500/20 transition-all w-full"
          style={{ padding: '6px 10px', fontSize: '13px' }}
        >
          <LogOut style={{ width: '14px', height: '14px' }} />
          <span style={{ fontWeight: 500 }}>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;