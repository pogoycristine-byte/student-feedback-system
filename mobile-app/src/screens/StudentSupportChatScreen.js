import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { supportAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    '  ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ─── Message Bubble ───────────────────────────────────────────────────────────

const MessageBubble = ({ msg, isMe }) => (
  <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
    <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperThem]}>
      {!isMe && (
        <Text style={styles.senderLabel}>Support</Text>
      )}
      {isMe ? (
        <LinearGradient
          colors={['#6D28D9', '#BE185D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleMe]}
        >
          <Text style={styles.bubbleTextMe}>{msg.message}</Text>
          {msg.edited && <Text style={styles.editedLabelMe}>edited</Text>}
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleThem]}>
          <Text style={styles.bubbleTextThem}>{msg.message}</Text>
          {msg.edited && <Text style={styles.editedLabelThem}>edited</Text>}
        </View>
      )}
      <Text style={[styles.timestamp, isMe ? styles.timestampMe : styles.timestampThem]}>
        {fmt(msg.createdAt)}
      </Text>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const StudentSupportChatScreen = ({ navigation, route }) => {
  const { user } = useAuth();

  // threadId can come from ContactSupport navigation or be fetched on mount
  const existingThreadId = route?.params?.threadId || null;

  const [threadId, setThreadId] = useState(existingThreadId);
  const [messages, setMessages] = useState([]);
  const [subject, setSubject]   = useState(route?.params?.subject || '');
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [noThread, setNoThread] = useState(false); // true = user has no thread yet

  const scrollRef = useRef(null);
  const pollRef   = useRef(null);

  // ── Load messages by threadId ────────────────────────────────────────────

const loadMessages = useCallback(async (id) => {
  if (!id) return;

  // Show cached messages instantly
  try {
    const cached = await AsyncStorage.getItem(`support_msgs_${id}`);
    if (cached) setMessages(JSON.parse(cached));
  } catch {}

  // Fetch fresh from API and update cache
  try {
    const res = await supportAPI.getMessages(id);
    const msgs = res.data.messages || [];
    setMessages(msgs);
    await AsyncStorage.setItem(`support_msgs_${id}`, JSON.stringify(msgs));
    await supportAPI.markAsRead(id);
  } catch {}
  finally {
    setLoading(false);
  }
}, []);

  // ── On mount: if no threadId passed, fetch user's thread ────────────────

  useEffect(() => {
    const init = async () => {
      let id = existingThreadId;

      // Persist threadId whenever we get one from navigation
      if (id) {
        await AsyncStorage.setItem('support_threadId', id);
      } else {
        // Try AsyncStorage before hitting the API
        id = await AsyncStorage.getItem('support_threadId');
      }

      if (id) {
        setThreadId(id);
        await loadMessages(id);
      } else {
        // Last resort: fetch from API
        try {
          const res = await supportAPI.getMyThreads();
          const threads = res.data.threads || [];
          if (threads.length > 0) {
            const thread = threads[0];
            setThreadId(thread._id);
            setSubject(thread.subject || '');
            await AsyncStorage.setItem('support_threadId', thread._id);
            await loadMessages(thread._id);
          } else {
            setNoThread(true);
            setLoading(false);
          }
        } catch {
          setNoThread(true);
          setLoading(false);
        }
      }
    };
    init();
  }, []);
  // ── Poll for new replies every 10 s ─────────────────────────────────────

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!threadId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await supportAPI.getMessages(threadId);
        setMessages(res.data.messages || []);
      } catch {}
    }, 10000);

    return () => clearInterval(pollRef.current);
  }, [threadId]);

  // ── Auto-scroll to bottom on new messages ───────────────────────────────

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [messages]);

  // ── Send ─────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !threadId) return;

    setSending(true);
    setInput('');

    try {
      // Optimistic update
      setMessages(prev => [
        ...prev,
        {
          _id: Date.now().toString(),
          message: text,
          senderName: user?.name,
          senderRole: user?.role,
          createdAt: new Date().toISOString(),
        },
      ]);
      await supportAPI.send(threadId, text);
      await loadMessages(threadId);
    } catch {
      setInput(text);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <LinearGradient
        colors={['#6D28D9', '#BE185D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Support Chat</Text>
            <Text style={styles.headerSub}>We typically reply within 24 hours</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* ── Loading ── */}
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color="#6D28D9" size="large" />
            <Text style={styles.loadingText}>Loading conversation…</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messageScroll}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Subject banner ── */}
            {subject.trim() !== '' && (
              <View style={styles.subjectBanner}>
                <Text style={styles.subjectBannerLabel}>Subject  </Text>
                <Text style={styles.subjectBannerText} numberOfLines={1}>{subject}</Text>
              </View>
            )}

            {/* ── No thread yet ── */}
            {noThread && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>Go to Contact Support to start a conversation with our team.</Text>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => navigation.navigate('ContactSupport')}
                >
                  <LinearGradient
                    colors={['#6D28D9', '#BE185D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.contactButtonGradient}
                  >
                    <Text style={styles.contactButtonText}>Contact Support</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Messages ── */}
            {messages.map((msg, i) => {
              const isMe = msg.senderName === user?.name;
              return <MessageBubble key={msg._id || i} msg={msg} isMe={isMe} />;
            })}

            <View style={{ height: 12 }} />
          </ScrollView>
        )}

        {/* ── Input bar — hidden if no thread ── */}
        {!noThread && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.inputField}
              value={input}
              onChangeText={setInput}
              placeholder="Reply to support…"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim() || sending}
              activeOpacity={0.8}
              style={{ marginLeft: 8 }}
            >
              <LinearGradient
                colors={input.trim() && !sending ? ['#6D28D9', '#BE185D'] : ['#D1D5DB', '#D1D5DB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButton}
              >
                {sending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.sendIcon}>➤</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 10 },
  backArrow: { fontSize: 28, color: '#fff', fontWeight: 'bold', lineHeight: 30 },
  headerTextGroup: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: '#fff' },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 13, color: '#6B7280', marginTop: 10 },

  messageScroll: { flex: 1 },
  messageContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },

  subjectBanner: {
    backgroundColor: '#EDE9FE', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 16,
    marginBottom: 16, flexDirection: 'row', alignItems: 'center',
  },
  subjectBannerLabel: { fontSize: 11, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5 },
  subjectBannerText: { fontSize: 13, color: '#4C1D95', fontWeight: '600', flexShrink: 1 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  contactButton: { borderRadius: 12, overflow: 'hidden' },
  contactButtonGradient: { paddingHorizontal: 24, paddingVertical: 12 },
  contactButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  bubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubbleWrapper: { maxWidth: '72%' },
  bubbleWrapperMe: { alignItems: 'flex-end' },
  bubbleWrapperThem: { alignItems: 'flex-start' },
  senderLabel: { fontSize: 11, fontWeight: '600', color: '#7C3AED', marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubbleTextMe: { fontSize: 14, color: '#fff', lineHeight: 20 },
  bubbleTextThem: { fontSize: 14, color: '#1F2937', lineHeight: 20 },
  editedLabelMe: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontStyle: 'italic' },
  editedLabelThem: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' },
  timestamp: { fontSize: 10, marginTop: 4, color: '#9CA3AF' },
  timestampMe: { textAlign: 'right' },
  timestampThem: { textAlign: 'left', marginLeft: 4 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 4,
  },
  inputField: {
    flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: '#1F2937', maxHeight: 110, lineHeight: 20,
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { fontSize: 16, color: '#fff', marginLeft: 2 },
});

export default StudentSupportChatScreen;