import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessagesSquare,
  Send,
  Search,
  Circle,
  ChevronLeft,
  User,
} from 'lucide-react';
import { messagesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const MessagesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const location = useLocation();

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [staffList, setStaffList]           = useState([]);
  const [threads, setThreads]               = useState([]);
  const [selectedId, setSelectedId]         = useState(null);
  const [selectedName, setSelectedName]     = useState('');
  const [isNewConvo, setIsNewConvo]         = useState(false);
  const [messages, setMessages]             = useState([]);
  const [input, setInput]                   = useState('');
  const [search, setSearch]                 = useState('');
  const [loading, setLoading]               = useState(true);
  const [sending, setSending]               = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [isLightMode, setIsLightMode]       = useState(document.body.classList.contains('light-mode'));
  const [newIdsSnapshot, setNewIdsSnapshot] = useState(new Set());
  const [optimisticRead, setOptimisticRead] = useState(new Set());

  const bottomRef    = useRef(null);
  const pollRef      = useRef(null);
  const unreadDivRef = useRef(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightMode(document.body.classList.contains('light-mode'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const loadList = useCallback(async () => {
    try {
      const [staffRes, threadsRes] = await Promise.allSettled([
        messagesAPI.getStaffList(),
        messagesAPI.getThreads(),
      ]);

      const allUsers   = staffRes.status === 'fulfilled'   ? staffRes.value.data.staff || []     : [];
      const threadData = threadsRes.status === 'fulfilled' ? threadsRes.value.data.threads || [] : [];

      const visibleStaff = isAdmin
        ? allUsers
        : allUsers.filter(u => u.role === 'admin');

      setStaffList(visibleStaff);
      setThreads(threadData);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadList(); }, [loadList]);

  // ── Build sidebar items ──
  const sidebarItems = staffList
    .map((s) => {
      const thread   = threads.find(t =>
        t.participants?.some(p => String(p._id || p) === String(s._id))
      );
      const threadId = String(thread?._id || '');
      const isUnread = (thread?.isUnread ?? false) && !optimisticRead.has(threadId);

      return {
        id:          thread?._id || s._id,
        isNewConvo:  !thread,
        name:        s.name,
        role:        s.role,
        lastMessage: thread?.lastMessage?.message || null,
        lastTime:    thread?.lastMessage?.createdAt || null,
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
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = sidebarItems.filter(s => s.isUnread).length;

  // ── Compute which message _ids are "new" to show the divider ──
  // Only messages AFTER the user's last sent message count as unread.
  const computeNewIds = useCallback((msgs) => {
    const currentUser = userRef.current;
    if (!msgs.length) return new Set();

    // Find the index of the last message the current user sent
    let lastMineIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].senderName === currentUser?.name) {
        lastMineIdx = i;
        break;
      }
    }

    // If user never replied, no unread divider needed (nothing to separate)
    // Only show divider for messages that arrived after their last reply
    if (lastMineIdx === -1) return new Set();

    return new Set(
      msgs.slice(lastMineIdx + 1)
        .filter(m => m.senderName !== currentUser?.name)
        .map(m => String(m._id))
    );
  }, []);

  const loadMessages = useCallback(async (id, newConvo) => {
    if (!id || newConvo) { setMessages([]); return; }
    try {
      const res  = await messagesAPI.getMessages(id);
      const msgs = res.data.messages || [];
      setNewIdsSnapshot(computeNewIds(msgs));
      setMessages(msgs);
      await messagesAPI.markAsRead(id);
      window.dispatchEvent(new Event('adminReadDm'));
    } catch {
      setMessages([]);
    }
  }, [computeNewIds]);

  const selectThread = (item) => {
    setSelectedId(item.id);
    setSelectedName(item.name);
    setIsNewConvo(item.isNewConvo);
    setNewIdsSnapshot(new Set());
    setOptimisticRead(prev => new Set([...prev, String(item.id)]));
    loadMessages(item.id, item.isNewConvo);
    setMobileShowChat(true);
  };

  // Scroll to unread divider on open, otherwise scroll to bottom
  useEffect(() => {
    if (unreadDivRef.current) {
      unreadDivRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const params   = new URLSearchParams(location.search);
    const threadId = params.get('thread');
    if (!threadId || loading) return;
    const match = sidebarItems.find(s => String(s.id) === threadId);
    if (match) {
      selectThread(match);
      window.history.replaceState({}, '', '/messages');
    }
  }, [location.search, loading, sidebarItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll messages ──
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedId || isNewConvo) return;

    pollRef.current = setInterval(async () => {
      try {
        const res  = await messagesAPI.getMessages(selectedId);
        const msgs = res.data.messages || [];
        setMessages(prev => {
          if (msgs.length > prev.length) {
            const newest = msgs[msgs.length - 1];
            if (newest?.senderName !== userRef.current?.name) {
              window.dispatchEvent(new Event('newDmReceived'));
            }
          }
          return msgs;
        });
      } catch {}
    }, 10000);

    return () => clearInterval(pollRef.current);
  }, [selectedId, isNewConvo]);

  // ── Poll thread list ──
  useEffect(() => {
    const listPoll = setInterval(() => { loadList(); }, 15000);
    return () => clearInterval(listPoll);
  }, [loadList]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setInput('');
    try {
      const res         = await messagesAPI.send(selectedId, text);
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
            _id:        Date.now().toString(),
            message:    text,
            senderRole: user?.role,
            senderName: user?.name,
            createdAt:  new Date().toISOString(),
          },
        ]);
        await loadMessages(selectedId, false);
      }
      window.dispatchEvent(new Event('dmSent'));
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

  // ── Index of first unread message — where the divider goes ──
  const firstNewIndex = messages.findIndex(
    (msg) => msg.senderName !== user?.name && newIdsSnapshot.has(String(msg._id))
  );

  return (
    <div className="flex flex-col h-full" style={{ padding: '20px' }}>

      {/* ── PAGE TITLE ── */}
      <div style={{ marginBottom: '16px' }}>
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 36, height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
            }}
          >
            <MessagesSquare style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1
                className="messages-page-title"
                style={{
                  fontSize: '22px', fontWeight: 700,
                  background: 'linear-gradient(90deg, #a78bfa, #f472b6)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text', lineHeight: 1.2, margin: 0,
                }}
              >
                Messages
              </h1>
            </div>
            <p
              className="messages-page-subtitle"
              style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, marginTop: 2 }}
            >
              {isAdmin ? 'Direct messages with staff members' : 'Your conversations'}
            </p>
          </div>
        </div>
      </div>

      {/* Main panel */}
      <div
        className="flex flex-1 rounded-xl overflow-hidden"
        style={{
          border: '1.5px solid rgba(0,0,0,0.15)',
          minHeight: 0,
          height: 'calc(100vh - 120px)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        {/* ── THREAD LIST SIDEBAR ── */}
        <div
          className={`flex flex-col flex-shrink-0 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}
          style={{
            width: 260,
            borderRight: '1.5px solid rgba(0,0,0,0.15)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ padding: '14px 12px 10px', borderBottom: '1.5px solid rgba(0,0,0,0.15)' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
              <MessagesSquare style={{ width: 14, height: 14, color: '#a78bfa' }} />
              <span className="font-semibold text-white" style={{ fontSize: 13 }}>
                {isAdmin ? 'Staff' : 'Conversations'}
              </span>
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
            <div
              className="flex items-center gap-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.07)', padding: '6px 10px' }}
            >
              <Search style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.4)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="bg-transparent outline-none text-white placeholder-gray-600 w-full"
                style={{ fontSize: 12 }}
              />
            </div>
          </div>

          {/* thread list */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '6px' }}>
            {loading ? (
              <p className="text-gray-400 text-center" style={{ fontSize: 12, marginTop: 20 }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-400 text-center" style={{ fontSize: 12, marginTop: 20 }}>No conversations</p>
            ) : (
              filtered.map((item) => {
                const isSelected = String(selectedId) === String(item.id);
                const isUnread   = item.isUnread && !isSelected;

                return (
                  <button
                    key={String(item.id)}
                    onClick={() => selectThread(item)}
                    className="w-full flex items-center gap-2 rounded-lg transition-all text-left"
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
                      // Bold left accent for unread
                      borderLeft: isUnread
                        ? '3px solid #ef4444'
                        : isSelected
                          ? '3px solid #a78bfa'
                          : '3px solid transparent',
                    }}
                  >
                    {/* Unread dot */}
                    <div style={{ width: 8, flexShrink: 0 }}>
                      {isUnread && (
                        <Circle style={{ width: 8, height: 8, fill: '#ef4444', color: '#ef4444' }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="truncate messages-name"
                          style={{
                            fontSize: 13,
                            color: isUnread
                              ? '#ffffff'
                              : isLightMode ? '#1e1b4b' : 'rgba(255,255,255,0.75)',
                            fontWeight: isUnread ? 700 : 500,
                          }}
                        >
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>

                          {item.lastTime && (
                            <span style={{
                              fontSize: 10,
                              color: isUnread ? 'rgba(255,255,255,0.5)' : '#6B7280',
                              marginLeft: 2,
                            }}>
                              {fmt(item.lastTime)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="truncate" style={{
                        fontSize: 11,
                        color: isUnread ? 'rgba(255,255,255,0.55)' : '#9CA3AF',
                        marginTop: 1,
                        fontWeight: isUnread ? 500 : 400,
                      }}>
                        {item.lastMessage || (item.isNewConvo ? 'Start a conversation' : 'No messages yet')}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div className={`flex flex-col flex-1 min-w-0 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3">
              <div
                className="rounded-2xl flex items-center justify-center"
                style={{ width: 56, height: 56, background: 'rgba(139,92,246,0.12)' }}
              >
                <MessagesSquare style={{ width: 24, height: 24, color: '#a78bfa' }} />
              </div>
              <p className="text-gray-400 font-medium" style={{ fontSize: 14 }}>Select a conversation</p>
              <p className="text-gray-600" style={{ fontSize: 12 }}>
                {isAdmin ? 'Choose a staff member to message' : 'Choose a thread to open'}
              </p>
            </div>
          ) : (
            <>
              {/* chat header */}
              <div
                className="flex items-center gap-3"
                style={{ padding: '12px 16px', borderBottom: '1.5px solid rgba(0,0,0,0.15)' }}
              >
                <button
                  className="md:hidden text-gray-400 hover:text-white transition-all"
                  onClick={() => setMobileShowChat(false)}
                >
                  <ChevronLeft style={{ width: 18, height: 18 }} />
                </button>
                <div>
                  <p className="text-white font-semibold" style={{ fontSize: 13 }}>{selectedName}</p>
                  <p className="text-gray-500" style={{ fontSize: 11 }}>
                    {isNewConvo ? 'New conversation' : isAdmin ? 'Staff' : 'Admin'}
                  </p>
                </div>
              </div>

              {/* messages */}
              <div className="flex-1 overflow-y-auto" style={{ padding: '16px' }}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <User style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.12)' }} />
                    <p className="text-gray-600" style={{ fontSize: 12 }}>No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMine     = msg.senderName === user?.name;
                    const isNew      = !isMine && newIdsSnapshot.has(String(msg._id));
                    const showDivider = i === firstNewIndex;

                    return (
                      <React.Fragment key={msg._id || i}>

                        {/* ── UNREAD DIVIDER — appears once before the first new message ── */}
                        {showDivider && (
                          <div
                            ref={unreadDivRef}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              margin: '12px 0',
                            }}
                          >
                            <div style={{ flex: 1, height: '0.5px', background: 'rgba(239,68,68,0.45)' }} />
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              color: '#ef4444',
                              background: 'rgba(239,68,68,0.1)',
                              border: '0.5px solid rgba(239,68,68,0.35)',
                              borderRadius: 99,
                              padding: '2px 10px',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                              fontFamily: 'monospace',
                            }}>
                              unread
                            </span>
                            <div style={{ flex: 1, height: '0.5px', background: 'rgba(239,68,68,0.45)' }} />
                          </div>
                        )}

                        {/* ── MESSAGE BUBBLE ── */}
                        <div
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                          style={{ marginBottom: 10 }}
                        >
                          <div style={{ maxWidth: '68%' }}>
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
                            <p style={{
                              fontSize: 10, color: 'rgba(255,255,255,0.3)',
                              marginTop: 3, textAlign: isMine ? 'right' : 'left',
                            }}>
                              {fmt(msg.createdAt)}
                            </p>
                          </div>
                        </div>

                      </React.Fragment>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* input */}
              <div
                className="flex items-end gap-2"
                style={{ padding: '10px 14px', borderTop: '1.5px solid rgba(0,0,0,0.15)' }}
              >
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message… (Enter to send)"
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

export default MessagesPage;