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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { feedbackAPI } from '../services/api';
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

// ── 5-day due date rule ──
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

const Sidebar = () => {
  const { logout, user } = useAuth();
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [dueSoonCount, setDueSoonCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

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

      // ── Count overdue + due today (unresolved only) ──
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
    const interval = setInterval(() => {
      computeCounts();
      computeScheduleBadge();
    }, 30000);

    window.addEventListener('feedbackDismissed', computeCounts);
    window.addEventListener('adminReadChat', computeCounts);
    window.addEventListener('schedulesUpdated', computeScheduleBadge);

    return () => {
      clearInterval(interval);
      window.removeEventListener('feedbackDismissed', computeCounts);
      window.removeEventListener('adminReadChat', computeCounts);
      window.removeEventListener('schedulesUpdated', computeScheduleBadge);
    };
  }, []);

  const totalBadge = newFeedbackCount + unreadChatCount;

  const navItems = [
    { name: 'Dashboard',           path: '/dashboard',       icon: LayoutDashboard },
    { name: 'Feedback',            path: '/feedback',         icon: MessageSquare,  badge: totalBadge, overdueBadge: overdueCount },
    { name: 'Manage Feedback',     path: '/staff/manage',     icon: ClipboardList,  staffOnly: true },
    { name: 'My Schedules',        path: '/schedules',        icon: CalendarClock,  staffOnly: true, badge: dueSoonCount },
    { name: 'Announcements',       path: '/announcements',    icon: Megaphone,      adminOnly: true },
    { name: 'Category',            path: '/categories',       icon: FolderOpen,     adminOnly: true },
    { name: 'User Management',     path: '/students',         icon: Users,          adminOnly: true },
    { name: 'Reports & Analytics', path: '/reports',          icon: BarChart2,      adminOnly: true },
    { name: 'System Settings',     path: '/settings',         icon: Settings,       adminOnly: true },
  ].filter(item => {
    if (item.adminOnly) return isAdmin;
    if (item.staffOnly) return !isAdmin;
    return true;
  });

  return (
    <div
      className="w-64 bg-white/5 backdrop-blur-lg border-r border-white/10 flex flex-col h-screen"
      style={{ isolation: 'isolate' }}
    >
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
          {isAdmin ? 'Admin Panel' : 'Staff Panel'}
        </h1>
        <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
          {user?.name}
          {user?.role && (
            <span className="text-xs bg-violet-500/30 text-violet-300 px-2 py-0.5 rounded-full">
              {user?.role}
            </span>
          )}
        </p>
      </div>

      <nav className="flex-1 p-4">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white'
                      : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
                <div className="ml-auto flex items-center gap-1">
                  {/* Overdue badge — orange */}
                  {item.overdueBadge > 0 && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center"
                      title={`${item.overdueBadge} overdue or due today`}>
                      {item.overdueBadge}⚠
                    </span>
                  )}
                  {/* New/unread badge — red */}
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </div>
              </NavLink>
              {/* Divider between every item */}
              {idx < navItems.length - 1 && (
                <div className="border-t border-white/10 mx-2" />
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        {!isAdmin && (
          <>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-all hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {lightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span className="font-medium">{lightMode ? 'Light Mode' : 'Dark Mode'}</span>
              <div className="ml-auto w-10 h-5 rounded-full relative transition-all" style={{
                background: lightMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{
                  left: lightMode ? '20px' : '2px'
                }} />
              </div>
            </button>
            <div className="border-t border-white/10 mx-2" />
          </>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/20 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;