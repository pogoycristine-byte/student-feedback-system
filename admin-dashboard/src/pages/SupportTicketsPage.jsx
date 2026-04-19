import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LifeBuoy,
  Send,
  Search,
  Circle,
  ChevronLeft,
  User,
  Trash2,
  Pencil,
  Check,
  X,
  MoreHorizontal,
  CheckCheck,
} from 'lucide-react';
import { supportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { markSupportAsRead } from '../components/Sidebar'; // FIX 1: import markSupportAsRead

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const DIVIDER_CACHE_KEY = 'support_divider_cache';

const loadDividerCache = () => {
  try {
    return JSON.parse(localStorage.getItem(DIVIDER_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveDividerCache = (cache) => {
  try {
    localStorage.setItem(DIVIDER_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

const shownDividerCache = loadDividerCache();

const MessageStatus = ({ msg, allMessages, currentUserName, currentUserId, lastReadBy }) => {
  const isMine = msg.senderName === currentUserName;
  if (!isMine) return null;

  const myMessages = allMessages.filter(m => m.senderName === currentUserName);
  const isLastMine =
    myMessages.length > 0 &&
    String(myMessages[myMessages.length - 1]._id) === String(msg._id);
  if (!isLastMine) return null;

  const myMsgIndex = allMessages.findIndex(m => String(m._id) === String(msg._id));

  const seenByOther = lastReadBy?.some(entry => {
    if (String(entry.userId) === String(currentUserId)) return false;
    const theirReadIndex = allMessages.findIndex(
      m => String(m._id) === String(entry.messageId)
    );
    return theirReadIndex >= myMsgIndex;
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      gap: 3, marginTop: 2,
    }}>
      {seenByOther ? (
        <>
          <CheckCheck style={{ width: 11, height: 11, color: '#a78bfa' }} />
          <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 500, letterSpacing: '0.02em' }}>Seen</span>
        </>
      ) : (
        <>
          <Check style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.35)' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.02em' }}>Sent</span>
        </>
      )}
    </div>
  );
};

const SupportTicketsPage = () => {
  const { user } = useAuth();
  const location = useLocation();

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [studentList, setStudentList] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isNewConvo, setIsNewConvo] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [isLightMode, setIsLightMode] = useState(document.body.classList.contains('light-mode'));
  const [newIdsSnapshot, setNewIdsSnapshot] = useState(new Set());
  const [optimisticRead, setOptimisticRead] = useState(new Set());
  const [lastReadBy, setLastReadBy] = useState([]);

  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);

  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const unreadDivRef = useRef(null);
  const isFreshOpenRef = useRef(false);
  const unreadTimerRef = useRef(null);
  const shownDividerRef = useRef(shownDividerCache);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightMode(document.body.classList.contains('light-mode'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handler = () => setMenuOpenId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const loadList = useCallback(async () => {
    try {
      const [studentsRes, threadsRes] = await Promise.allSettled([
        supportAPI.getStudentList(),
        supportAPI.getThreads(),
      ]);

      const allStudents = studentsRes.status === 'fulfilled' ? studentsRes.value.data.students || [] : [];
      const threadData = threadsRes.status === 'fulfilled' ? threadsRes.value.data.threads || [] : [];

      setStudentList(allStudents);
      setThreads(threadData);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

 const sidebarItems = studentList
  .filter((s) => threads.some(t =>
    t.participants?.some(p => String(p._id || p) === String(s._id))
  ))
  .map((s) => {
    const thread = threads.find(t =>
      t.participants?.some(p => String(p._id || p) === String(s._id))
    );
    const threadId = String(thread._id);
    const isUnread = (thread?.isUnread ?? false) && !optimisticRead.has(threadId);

    return {
      id: thread._id,
      isNewConvo: false,
      name: s.name,
      subject: thread?.subject || 'Support Request',
      lastMessage: thread?.lastMessage?.message || null,
      lastTime: thread?.lastMessage?.createdAt || null,
      isUnread,
    };
  })
  .sort((a, b) => {
    if (!a.lastTime && !b.lastTime) return 0;
    if (!a.lastTime) return 1;
    if (!b.lastTime) return -1;
    return new Date(b.lastTime) - new Date(a.lastTime);
  });

  const filtered = sidebarItems.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.subject.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = sidebarItems.filter(s => s.isUnread).length;

  const computeNewIds = useCallback((msgs, threadKey) => {
    if (!msgs.length) return new Set();
    const lastSeenId = shownDividerRef.current[threadKey];

    // If we have a cache entry, only messages after that point from students are new
    if (lastSeenId) {
      const lastSeenIdx = msgs.findIndex(m => String(m._id) === lastSeenId);
      if (lastSeenIdx === -1) return new Set(); // cache id not found, play it safe
      return new Set(
        msgs.slice(lastSeenIdx + 1)
          .filter(m => m.senderRole === 'student')
          .map(m => String(m._id))
      );
    }

    // No cache yet — fall back to anchoring from last message sent by current user
    const currentUser = userRef.current;
    let lastMineIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].senderName === currentUser?.name) { lastMineIdx = i; break; }
    }
    if (lastMineIdx === -1) return new Set();
    return new Set(
      msgs.slice(lastMineIdx + 1)
        .filter(m => m.senderRole === 'student')
        .map(m => String(m._id))
    );
  }, []);

  const loadMessages = useCallback(async (id, newConvo, isUnread) => {
    if (!id || newConvo) { setMessages([]); return; }
    try {
      const res = await supportAPI.getMessages(id);
      const msgs = res.data.messages || [];
      setLastReadBy(res.data.lastReadBy || []);

      if (isFreshOpenRef.current) {
        isFreshOpenRef.current = false;
        const threadKey = String(id);
        const lastMsg = msgs[msgs.length - 1];
        const lastMsgId = lastMsg ? String(lastMsg._id) : null;
        const lastSeenId = shownDividerRef.current[threadKey];

        // Only highlight if: server says unread AND there are new student msgs
        // AND we haven't already shown the divider for this exact last message
        const newIds = computeNewIds(msgs, threadKey);
        const hasNewToShow = isUnread && newIds.size > 0 && lastMsgId !== lastSeenId;

        if (hasNewToShow) {
          setNewIdsSnapshot(newIds);
          if (unreadTimerRef.current) clearTimeout(unreadTimerRef.current);
          unreadTimerRef.current = setTimeout(() => setNewIdsSnapshot(new Set()), 5000);
        } else {
          setNewIdsSnapshot(new Set());
        }

        // Always seed/update the cache to the current last message
        // so re-opening this thread won't re-show the divider
        if (lastMsgId) {
          shownDividerRef.current[threadKey] = lastMsgId;
          saveDividerCache(shownDividerRef.current);
        }
      }

      setMessages(msgs);
      await supportAPI.markAsRead(id);

      // Update localStorage read state so sidebar badge clears immediately
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg) {
        markSupportAsRead(String(id), String(lastMsg._id));
        // Force sidebar to recount right now, not on next poll
        window.dispatchEvent(new Event('adminReadSupport'));
      }

    } catch {
      setMessages([]);
    }
  }, [computeNewIds]);

  const selectThread = (item) => {
    setSelectedId(item.id);
    setSelectedName(item.name);
    setSelectedSubject(item.subject);
    setIsNewConvo(item.isNewConvo);
    setNewIdsSnapshot(new Set());
    setOptimisticRead(prev => new Set([...prev, String(item.id)]));
    isFreshOpenRef.current = true;
    if (unreadTimerRef.current) clearTimeout(unreadTimerRef.current);
    loadMessages(item.id, item.isNewConvo, item.isUnread);
    setMobileShowChat(true);
    setEditingMsgId(null);
    setMenuOpenId(null);
  };

  const handleBack = () => {
    setNewIdsSnapshot(new Set());
    if (unreadTimerRef.current) clearTimeout(unreadTimerRef.current);
    setMobileShowChat(false);
    setEditingMsgId(null);
    setMenuOpenId(null);
  };

  useEffect(() => {
    if (unreadDivRef.current) {
      unreadDivRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const threadId = params.get('thread');
    if (!threadId || loading) return;
    const match = sidebarItems.find(s => String(s.id) === threadId);
    if (match) {
      selectThread(match);
      window.history.replaceState({}, '', '/support-tickets');
    }
  }, [location.search, loading, sidebarItems.length]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedId || isNewConvo) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await supportAPI.getMessages(selectedId);
        const msgs = res.data.messages || [];
        setLastReadBy(res.data.lastReadBy || []);
        setMessages(prev => {
          if (msgs.length > prev.length) {
            const newest = msgs[msgs.length - 1];
            if (newest?.senderName !== userRef.current?.name) {
              window.dispatchEvent(new Event('newSupportMessage'));
            }
          }
          return msgs;
        });
        // Since we're actively viewing, mark as read and clear sidebar badge
        await supportAPI.markAsRead(selectedId);
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg) markSupportAsRead(String(selectedId), String(lastMsg._id));
      } catch {}
    }, 10000);

    return () => clearInterval(pollRef.current);
  }, [selectedId, isNewConvo]);

  useEffect(() => {
    const listPoll = setInterval(() => loadList(), 15000);
    return () => clearInterval(listPoll);
  }, [loadList]);

  useEffect(() => {
    return () => { if (unreadTimerRef.current) clearTimeout(unreadTimerRef.current); };
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await supportAPI.send(selectedId, text);
      const newThreadId = res.data.threadId;

      if (isNewConvo && newThreadId) {
        setSelectedId(newThreadId);
        setIsNewConvo(false);
        setOptimisticRead(prev => new Set([...prev, String(newThreadId)]));
        await loadMessages(newThreadId, false);
      } else {
        setMessages(prev => [
          ...prev,
          {
            _id: Date.now().toString(),
            message: text,
            senderRole: user?.role,
            senderName: user?.name,
            createdAt: new Date().toISOString(),
          },
        ]);
        await loadMessages(selectedId, false);
      }
      await loadList();
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleDeleteForEveryone = async (msgId) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await supportAPI.deleteMessage(selectedId, msgId);
      setMessages(prev => prev.filter(m => String(m._id) !== String(msgId)));
    } catch {}
    setMenuOpenId(null);
  };

  const handleDeleteForMe = async (msgId) => {
    if (!window.confirm('Delete this message for yourself only?')) return;
    try {
      await supportAPI.deleteMessageForMe(selectedId, msgId);
      setMessages(prev => prev.filter(m => String(m._id) !== String(msgId)));
    } catch {}
    setMenuOpenId(null);
  };

  const handleSaveEdit = async (msgId) => {
    const text = editingText.trim();
    if (!text) return;
    try {
      await supportAPI.editMessage(selectedId, msgId, text);
      setMessages(prev =>
        prev.map(m => String(m._id) === String(msgId) ? { ...m, message: text, edited: true } : m)
      );
    } catch {}
    setEditingMsgId(null);
    setEditingText('');
  };

  const handleDeleteConversation = async () => {
    if (!selectedId || isNewConvo) return;
    if (!window.confirm('Delete this entire support ticket? This cannot be undone.')) return;
    try {
      await supportAPI.deleteThread(selectedId);
      setSelectedId(null);
      setSelectedName('');
      setMessages([]);
      setMobileShowChat(false);
      await loadList();
    } catch {}
  };

  const firstNewIndex = messages.findIndex(
    (msg) => msg.senderName !== user?.name && newIdsSnapshot.has(String(msg._id))
  );

  return (
    <div className="flex flex-col h-full" style={{ padding: '20px' }}>

      {/* PAGE TITLE */}
      <div style={{ marginBottom: '16px' }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
          }}>
            <LifeBuoy style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{
              fontSize: '22px', fontWeight: 700,
              background: 'linear-gradient(90deg, #a78bfa, #f472b6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.2, margin: 0,
            }}>
              Support Tickets
            </h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, marginTop: 2 }}>
              Student inquiries from the Contact Support form
            </p>
          </div>
        </div>
      </div>

      {/* MAIN PANEL */}
      <div
        className="flex flex-1 rounded-xl overflow-hidden"
        style={{
          border: '1.5px solid rgba(0,0,0,0.15)',
          minHeight: 0,
          height: 'calc(100vh - 120px)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >

        {/* SIDEBAR */}
        <div
          className={`flex flex-col flex-shrink-0 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}
          style={{
            width: 270,
            borderRight: '1.5px solid rgba(0,0,0,0.15)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {/* Sidebar header */}
          <div style={{ padding: '14px 12px 10px', borderBottom: '1.5px solid rgba(0,0,0,0.15)' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
              <LifeBuoy style={{ width: 14, height: 14, color: '#a78bfa' }} />
              <span className="font-semibold text-white" style={{ fontSize: 13 }}>Students</span>
              {totalUnread > 0 && (
                <span style={{
                  background: '#ef4444', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  borderRadius: 99, padding: '1px 6px',
                  fontFamily: 'monospace', letterSpacing: '0.04em', marginLeft: 2,
                }}>
                  {totalUnread}
                </span>
              )}
            </div>

            {/* Search */}
            <div
              className="flex items-center gap-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.07)', padding: '6px 10px' }}
            >
              <Search style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.4)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student or subject…"
                className="bg-transparent outline-none text-white placeholder-gray-600 w-full"
                style={{ fontSize: 12 }}
              />
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '6px' }}>
            {loading ? (
              <p className="text-gray-400 text-center" style={{ fontSize: 12, marginTop: 20 }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-400 text-center" style={{ fontSize: 12, marginTop: 20 }}>No tickets found</p>
            ) : (
              filtered.map((item) => {
                const isSelected = String(selectedId) === String(item.id);
                const isUnread = item.isUnread && !isSelected;

                return (
                  <button
                    key={String(item.id)}
                    onClick={() => selectThread(item)}
                    className="w-full flex items-start gap-2 rounded-lg transition-all text-left"
                    style={{
                      padding: '8px 10px', marginBottom: 2,
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.15))'
                        : isUnread
                          ? 'rgba(239,68,68,0.14)'
                          : 'transparent',
                      border: isSelected
                        ? '1px solid rgba(139,92,246,0.3)'
                        : isUnread
                          ? '1px solid rgba(239,68,68,0.4)'
                          : '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 8,
                      borderLeft: isUnread
                        ? '3px solid #ef4444'
                        : isSelected
                          ? '3px solid #a78bfa'
                          : '3px solid transparent',
                    }}
                  >
                    <div style={{ width: 8, flexShrink: 0, paddingTop: 4 }}>
                      {isUnread && (
                        <Circle style={{ width: 8, height: 8, fill: '#ef4444', color: '#ef4444' }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="truncate"
                          style={{
                            fontSize: 13,
                            color: isUnread ? '#ffffff' : isLightMode ? '#1e1b4b' : 'rgba(255,255,255,0.75)',
                            fontWeight: isUnread ? 700 : 500,
                          }}
                        >
                          {item.name}
                        </span>
                        {item.lastTime && (
                          <span style={{ fontSize: 10, color: isUnread ? 'rgba(255,255,255,0.5)' : '#6B7280', flexShrink: 0 }}>
                            {fmt(item.lastTime)}
                          </span>
                        )}
                      </div>

                      {/* Subject line */}
                      <p className="truncate" style={{ fontSize: 11, color: '#a78bfa', fontWeight: 500, marginTop: 2 }}>
                        {item.subject}
                      </p>

                      <p className="truncate" style={{
                        fontSize: 11,
                        color: isUnread ? 'rgba(255,255,255,0.55)' : '#9CA3AF',
                        marginTop: 2,
                        fontWeight: isUnread ? 500 : 400,
                      }}>
                        {item.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className={`flex flex-col flex-1 min-w-0 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3">
              <div
                className="rounded-2xl flex items-center justify-center"
                style={{ width: 56, height: 56, background: 'rgba(139,92,246,0.12)' }}
              >
                <LifeBuoy style={{ width: 24, height: 24, color: '#a78bfa' }} />
              </div>
              <p className="text-gray-400 font-medium" style={{ fontSize: 14 }}>Select a support ticket</p>
              <p className="text-gray-600" style={{ fontSize: 12 }}>Choose a student inquiry to respond</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div
                className="flex items-center gap-3"
                style={{ padding: '12px 16px', borderBottom: '1.5px solid rgba(0,0,0,0.15)' }}
              >
                <button className="md:hidden text-gray-400 hover:text-white transition-all" onClick={handleBack}>
                  <ChevronLeft style={{ width: 18, height: 18 }} />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate" style={{ fontSize: 13 }}>{selectedName}</p>
                  <p className="truncate" style={{ fontSize: 11, color: '#a78bfa' }}>{selectedSubject}</p>
                </div>

                {/* Delete conversation */}
                {!isNewConvo && (
                  <button
                    onClick={handleDeleteConversation}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 7,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#f87171', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                    Delete
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto" style={{ padding: '16px' }}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <User style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.12)' }} />
                    <p className="text-gray-600" style={{ fontSize: 12 }}>No messages yet. Reply to the student!</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMine = msg.senderName === user?.name;
                    const isNew = !isMine && newIdsSnapshot.has(String(msg._id));
                    const showDivider = i === firstNewIndex;
                    const isEditing = editingMsgId === String(msg._id);
                    const isMenuOpen = menuOpenId === String(msg._id);

                    // ── Show sender name only for non-mine messages,
                    //    and only when the sender changes from the previous message ──
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const showSenderName = !isMine && (!prevMsg || prevMsg.senderName !== msg.senderName);

                    return (
                      <React.Fragment key={msg._id || i}>

                        {/* Unread divider */}
                        {showDivider && (
                          <div ref={unreadDivRef} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
                            <div style={{ flex: 1, height: '0.5px', background: 'rgba(239,68,68,0.45)' }} />
                            <span style={{
                              fontSize: 10, fontWeight: 600, color: '#ef4444',
                              background: 'rgba(239,68,68,0.1)',
                              border: '0.5px solid rgba(239,68,68,0.35)',
                              borderRadius: 99, padding: '2px 10px',
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              whiteSpace: 'nowrap', fontFamily: 'monospace',
                            }}>
                              unread
                            </span>
                            <div style={{ flex: 1, height: '0.5px', background: 'rgba(239,68,68,0.45)' }} />
                          </div>
                        )}

                        {/* Message bubble */}
                        <div
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                          style={{ marginBottom: 10, position: 'relative' }}
                          onMouseEnter={() => setHoveredMsgId(String(msg._id))}
                          onMouseLeave={() => setHoveredMsgId(null)}
                        >
                          <div style={{ maxWidth: '68%', position: 'relative' }}>

                            {/* Hover action (own messages only) */}
                            {isMine && hoveredMsgId === String(msg._id) && !isEditing && (
                              <div
                                style={{ position: 'absolute', top: 0, right: 'calc(100% + 6px)', display: 'flex', alignItems: 'center', zIndex: 10 }}
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : String(msg._id)); }}
                                  style={{
                                    width: 26, height: 26, borderRadius: 6,
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  <MoreHorizontal style={{ width: 13, height: 13 }} />
                                </button>

                                {isMenuOpen && (
                                  <div
                                    style={{
                                      position: 'absolute', top: 30, right: 0,
                                      background: '#1e1535', border: '1px solid rgba(255,255,255,0.12)',
                                      borderRadius: 8, overflow: 'hidden',
                                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 20, minWidth: 160,
                                    }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => { setEditingMsgId(String(msg._id)); setEditingText(msg.message); setMenuOpenId(null); }}
                                      style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                      <Pencil style={{ width: 11, height: 11 }} /> Edit message
                                    </button>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                    <button
                                      onClick={() => handleDeleteForEveryone(msg._id)}
                                      style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                      <Trash2 style={{ width: 11, height: 11 }} /> Delete for Everyone
                                    </button>
                                    <button
                                      onClick={() => handleDeleteForMe(msg._id)}
                                      style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#fb923c', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,146,60,0.1)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                      <Trash2 style={{ width: 11, height: 11 }} /> Delete for You
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Bubble or edit input */}
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <textarea
                                  value={editingText}
                                  onChange={e => setEditingText(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(msg._id); }
                                    if (e.key === 'Escape') { setEditingMsgId(null); setEditingText(''); }
                                  }}
                                  autoFocus
                                  rows={2}
                                  style={{
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(124,58,237,0.5)',
                                    borderRadius: 10, padding: '8px 10px', color: '#fff', fontSize: 13,
                                    resize: 'none', outline: 'none', width: '100%', minWidth: 180,
                                  }}
                                />
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => { setEditingMsgId(null); setEditingText(''); }}
                                    style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <X style={{ width: 10, height: 10 }} /> Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveEdit(msg._id)}
                                    style={{ padding: '4px 10px', borderRadius: 6, background: 'linear-gradient(135deg, #7c3aed, #db2777)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Check style={{ width: 10, height: 10 }} /> Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {/* ── Sender name label — only for non-mine, only when sender changes ── */}
                                {showSenderName && (
                                  <p style={{
                                    fontSize: 11, fontWeight: 600,
                                    color: msg.senderRole === 'student' ? '#a78bfa' : '#34d399',
                                    marginBottom: 3, marginLeft: 4,
                                  }}>
                                    {msg.senderName}
                                    {msg.senderRole && msg.senderRole !== 'student' && (
                                      <span style={{
                                        marginLeft: 5, fontSize: 9, fontWeight: 500,
                                        color: 'rgba(255,255,255,0.35)',
                                        textTransform: 'capitalize',
                                      }}>
                                        ({msg.senderRole})
                                      </span>
                                    )}
                                  </p>
                                )}
                                <div style={{
                                  padding: '8px 12px',
                                  background: isMine
                                    ? 'linear-gradient(135deg, #7c3aed, #db2777)'
                                    : isNew
                                      ? 'rgba(239,68,68,0.10)'
                                      : 'rgba(255,255,255,0.08)',
                                  border: isNew && !isMine
                                    ? '1px solid rgba(239,68,68,0.30)'
                                    : isMine ? 'none' : '1px solid rgba(0,0,0,0.1)',
                                  borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                }}>
                                  <p className="text-white" style={{ fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word' }}>
                                    {msg.message}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Timestamp + status */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                                {fmt(msg.createdAt)}
                                {msg.edited && <span style={{ marginLeft: 4, opacity: 0.6 }}>(edited)</span>}
                              </span>
                              <MessageStatus
                                msg={msg}
                                allMessages={messages}
                                currentUserName={user?.name}
                                currentUserId={user?.id}
                                lastReadBy={lastReadBy}
                              />
                            </div>
                          </div>
                        </div>

                      </React.Fragment>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div
                className="flex items-end gap-2"
                style={{ padding: '10px 14px', borderTop: '1.5px solid rgba(0,0,0,0.15)' }}
              >
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Reply to student… (Enter to send)"
                  rows={1}
                  className="flex-1 rounded-xl text-white placeholder-gray-600 outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(0,0,0,0.12)',
                    padding: '9px 12px', fontSize: 13,
                    lineHeight: 1.45, maxHeight: 120, overflowY: 'auto',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  style={{
                    width: 38, height: 38,
                    background: input.trim() && !sending
                      ? 'linear-gradient(135deg, #7c3aed, #db2777)'
                      : 'rgba(255,255,255,0.07)',
                    cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Send style={{ width: 15, height: 15, color: input.trim() && !sending ? '#fff' : 'rgba(255,255,255,0.3)' }} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTicketsPage;