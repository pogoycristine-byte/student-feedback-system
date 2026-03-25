import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { feedbackAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const HEADER_HEIGHT = 94;

const ChatScreen = ({ route, navigation }) => {
  const feedbackId = route?.params?.feedbackId;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Get anonymous flag from route params
  const isAnonymous = route?.params?.isAnonymous || false;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (!feedbackId) {
      navigation.goBack();
    }
  }, [feedbackId]);

  useEffect(() => {
    if (!feedbackId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const prevMessageCount = useRef(0);
  const isSending = useRef(false);
  useEffect(() => {
    if (messages.length > prevMessageCount.current && !isSending.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await feedbackAPI.getMessages(feedbackId);
      setFeedback(response.data.feedback);
      setMessages(response.data.messages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    isSending.current = true;
    setSending(true);
    try {
      await feedbackAPI.sendMessage(feedbackId, newMessage.trim());
      setNewMessage('');
      Keyboard.dismiss();
      await fetchMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        isSending.current = false;
      }, 300);
    } catch (error) {
      alert('Failed to send message');
      isSending.current = false;
    } finally {
      setSending(false);
    }
  };

  const getSenderDisplayName = (sender, senderRole) => {
    // If feedback is anonymous and sender is student, show "Anonymous Student"
    if (isAnonymous && senderRole === 'student') {
      return 'Anonymous Student';
    }
    // If sender is staff, show "Staff"
    if (senderRole === 'staff') {
      return 'Staff';
    }
    // If sender is admin, show "Admin"
    if (senderRole === 'admin') {
      return 'Admin';
    }
    // For students, show their name
    return sender?.name || 'Unknown';
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender._id === user.id;
    const senderDisplayName = getSenderDisplayName(item.sender, item.senderRole);
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
        ]}>
          {!isMyMessage && (
            <Text style={styles.senderName}>
              {senderDisplayName} {item.senderRole === 'admin' ? '👨‍💼' : (item.senderRole === 'staff' ? '👨‍🏫' : '')}
            </Text>
          )}
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.theirMessageTime
          ]}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (!feedbackId) return null;

  if (loading) {
    return (
      <View style={styles.container}>
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
            <Text style={styles.headerTitle}>Chat</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6D28D9" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={[styles.messagesList, { paddingTop: HEADER_HEIGHT }]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        style={{ flex: 1 }}
      />

      {/* Input bar */}
      <View style={[styles.inputContainer, {
        paddingBottom: keyboardHeight > 0 ? 46 : (insets.bottom > 0 ? insets.bottom : 12),
      }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          disabled={sending || !newMessage.trim()}
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
        >
          <LinearGradient colors={['#6D28D9', '#BE185D']} style={styles.sendButtonGradient}>
            <Text style={styles.sendButtonText}>{sending ? '...' : '📤'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Fixed header */}
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
          <Text style={styles.headerTitle}>{feedback?.subject}</Text>
        </View>
      </LinearGradient>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 10 },
  backArrow: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageContainer: { marginBottom: 12 },
  myMessage: { alignItems: 'flex-end' },
  theirMessage: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '75%', borderRadius: 16, padding: 12 },
  myMessageBubble: { backgroundColor: '#6D28D9' },
  theirMessageBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0' },
  senderName: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  theirMessageText: { color: '#1a1a2e' },
  messageTime: { fontSize: 10, marginTop: 4 },
  myMessageTime: { color: '#fff', opacity: 0.8 },
  theirMessageTime: { color: '#999' },
  inputContainer: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, maxHeight: 100, color: '#1a1a2e' },
  sendButton: { justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonGradient: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendButtonText: { fontSize: 20 },
});

export default ChatScreen;