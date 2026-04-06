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
import { markDmAsRead } from '../components/Sidebar';

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

  const [staffList, setStaffList] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [isNewConvo, setIsNewConvo] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const loadList = useCallback(async () => {
    try {
      if (isAdmin) {
        const [staffRes, threadsRes] = await Promise.allSettled([
          messagesAPI.getStaffList(),
          messagesAPI.getThreads(),
        ]);
        const staff = staffRes.status === 'fulfilled' ? staffRes.value.data.staff || [] : [];
        const threadData = threadsRes.status === 'fulfilled' ? threadsRes.value.data.threads || [] : [];
        setStaffList(staff);
        setThreads(threadData);
      } else {
        const res = await messagesAPI.getThreads();
        setThreads(res.data.threads || []);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadList(); }, [loadList]);

  const sidebarItems = isAdmin
    ? staffList.map((s) => {
        const thread = threads.find(
          (t) => t.participants?.some((p) => (p._id || p) === s._id)
        );
        return {
          id: thread?._id || s._id,
          isNewConvo: !thread,
          name: s.name,
          role: s.role || 'staff',
          lastMessage: thread?.lastMessage?.message || null,
          lastTime: thread?.lastMessage?.createdAt || null,
          unread: thread?.unread || false,
        };
      })
    : threads.map((t) => ({
        id: t._id,
        isNewConvo: false,
        name: t.participants?.find((p) => p._id !== user?._id)?.name || 'Admin',
        role: 'admin',
        lastMessage: t.lastMessage?.message || null,
        lastTime: t.lastMessage?.createdAt || null,
        unread: t.unread || false,
      }));

  const filtered = sidebarItems.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const loadMessages = useCallback(async (id, newConvo) => {
    if (!id || newConvo) { setMessages([]); return; }
    try {
      const res = await messagesAPI.getMessages(id);
      const msgs = res.data.messages || [];
      setMessages(msgs);
      if (msgs.length > 0) {
        markDmAsRead(id, msgs[msgs.length - 1]._id);
        window.dispatchEvent(new Event('adminReadDm'));
      }
    } catch {
      setMessages([]);
    }
  }, []);

  const selectThread = (item) => {
    setSelectedId(item.id);
    setSelectedName(item.name);
    setIsNewConvo(item.isNewConvo);
    loadMessages(item.id, item.isNewConvo);
    setMobileShowChat(true);
  };

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedId || isNewConvo) return;
    pollRef.current = setInterval(() => loadMessages(selectedId, false), 10000);
    return () => clearInterval(pollRef.current);
  }, [selectedId, isNewConvo, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await messagesAPI.send(selectedId, text);
      const newThreadId = res.data.threadId;

      if (isNewConvo && newThreadId) {
        setSelectedId(newThreadId);
        setIsNewConvo(false);
        await loadMessages(newThreadId, false);
      } else {
        setMessages((prev) => [
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

  return (
    <div className="flex flex-col h-full" style={{ padding: '20px' }}>

      {/* Main panel */}
      <div
        className="flex flex-1 rounded-xl overflow-hidden"
        style={{
          border: '1.5px solid rgba(0,0,0,0.15)',
          minHeight: 0,
          height: 'calc(100vh - 80px)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        {/* ── SIDEBAR ── */}
        <div
          className={`flex flex-col flex-shrink-0 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}
          style={{
            width: 260,
            borderRight: '1.5px solid rgba(0,0,0,0.15)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {/* header */}
          <div style={{
            padding: '14px 12px 10px',
            borderBottom: '1.5px solid rgba(0,0,0,0.15)',
          }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
              <MessagesSquare style={{ width: 14, height: 14, color: '#a78bfa' }} />
              <span className="font-semibold text-white" style={{ fontSize: 13 }}>
                {isAdmin ? 'Staff' : 'Conversations'}
              </span>
            </div>
            <div
              className="flex items-center gap-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.07)', padding: '6px 10px' }}
            >
              <Search style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.4)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="bg-transparent outline-none text-white placeholder-gray-600 w-full"
                style={{ fontSize: 12 }}
              />
            </div>
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '6px' }}>
            {loading ? (
              <p className="text-gray-400 text-center" style={{ fontSize: 12, marginTop: 20 }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-400 text-center" style={{ fontSize: 12, marginTop: 20 }}>No conversations</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectThread(item)}
                  className="w-full flex items-center gap-2 rounded-lg transition-all text-left"
                  style={{
                    padding: '8px 10px',
                    marginBottom: 2,
                    background: selectedId === item.id
                      ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.15))'
                      : 'transparent',
                    border: selectedId === item.id
                      ? '1px solid rgba(139,92,246,0.3)'
                      : '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ width: 8, flexShrink: 0 }}>
                    {item.unread && (
                      <Circle style={{ width: 8, height: 8, fill: '#ef4444', color: '#ef4444' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className="truncate"
                        style={{
                          fontSize: 13,
                          color: 'rgba(255, 255, 255, 0.75)',
                          fontWeight: item.unread ? 700 : 500,
                        }}
                      >
                        {item.name}
                      </span>
                      {item.lastTime && (
                        <span style={{ fontSize: 10, color: '#6B7280', flexShrink: 0, marginLeft: 4 }}>
                          {fmt(item.lastTime)}
                        </span>
                      )}
                    </div>
                    <p
                      className="truncate"
                      style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}
                    >
                      {item.lastMessage || (item.isNewConvo ? 'Start a conversation' : 'No messages yet')}
                    </p>
                  </div>
                </button>
              ))
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
                style={{
                  padding: '12px 16px',
                  borderBottom: '1.5px solid rgba(0,0,0,0.15)',
                }}
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
                    {isNewConvo ? 'New conversation' : 'Staff'}
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
                    const isMine = msg.senderName === user?.name;
                    return (
                      <div
                        key={msg._id || i}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        style={{ marginBottom: 10 }}
                      >
                        <div style={{ maxWidth: '68%' }}>
                          <div
                            style={{
                              padding: '8px 12px',
                              background: isMine
                                ? 'linear-gradient(135deg, #7c3aed, #db2777)'
                                : 'rgba(255,255,255,0.08)',
                              border: isMine ? 'none' : '1px solid rgba(0,0,0,0.1)',
                              borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            }}
                          >
                            <p className="text-white" style={{ fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word' }}>
                              {msg.message}
                            </p>
                          </div>
                          <p
                            style={{
                              fontSize: 10,
                              color: 'rgba(255,255,255,0.3)',
                              marginTop: 3,
                              textAlign: isMine ? 'right' : 'left',
                            }}
                          >
                            {fmt(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* input */}
              <div
                className="flex items-end gap-2"
                style={{
                  padding: '10px 14px',
                  borderTop: '1.5px solid rgba(0,0,0,0.15)',
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  className="flex-1 rounded-xl text-white placeholder-gray-600 outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(0,0,0,0.12)',
                    padding: '9px 12px',
                    fontSize: 13,
                    lineHeight: 1.45,
                    maxHeight: 120,
                    overflowY: 'auto',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  style={{
                    width: 38,
                    height: 38,
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