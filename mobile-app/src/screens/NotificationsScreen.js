import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { feedbackAPI } from '../services/api';

const READ_NOTIFICATIONS_KEY = 'readNotifications';
const LAST_READ_MSG_KEY = 'studentLastReadMsgId';

const getLastReadMessages = async () => {
  try {
    const saved = await AsyncStorage.getItem(LAST_READ_MSG_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
};

const saveLastReadMessage = async (feedbackId, lastMessageId) => {
  try {
    const map = await getLastReadMessages();
    map[feedbackId] = lastMessageId;
    await AsyncStorage.setItem(LAST_READ_MSG_KEY, JSON.stringify(map));
  } catch {}
};

const NotificationsScreen = ({ navigation, route }) => {
  const [statusNotifications, setStatusNotifications] = useState([]);
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || 'status');
  const [readItems, setReadItems] = useState(new Set());
  const [lastReadMsgMap, setLastReadMsgMap] = useState({});

  useEffect(() => {
    fetchNotifications();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReadItems();
      fetchNotifications();
    }, [])
  );

  const loadReadItems = async () => {
    try {
      const saved = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
      if (saved) setReadItems(new Set(JSON.parse(saved)));
      const msgMap = await getLastReadMessages();
      setLastReadMsgMap(msgMap);
    } catch (error) {
      console.error('Error loading read items:', error);
    }
  };

  const saveReadItems = async (items) => {
    try {
      await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...items]));
    } catch (error) {
      console.error('Error saving read items:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await feedbackAPI.getMyFeedback();

      const statusChanges = response.data.feedback.filter(
        (item) => item.status !== 'Pending'
      );

      const adminMessages = await Promise.all(
        response.data.feedback
          .filter((item) => item.adminResponse?.comment)
          .map(async (item) => {
            try {
              const msgRes = await feedbackAPI.getMessages(item._id);
              const messages = msgRes.data.messages || [];
              const lastAdminMsg = [...messages].reverse().find(m => m.senderRole === 'admin' || m.senderRole === 'staff');
              return { ...item, _lastAdminMsgId: lastAdminMsg?._id || null, _lastAdminMsgText: lastAdminMsg?.message || null };
            } catch {
              return { ...item, _lastAdminMsgId: null, _lastAdminMsgText: null };
            }
          })
      );

      setStatusNotifications(statusChanges);
      setMessageNotifications(adminMessages);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReadItems();
    fetchNotifications();
  };

  const markAsRead = (itemId) => {
    const newReadItems = new Set([...readItems, itemId]);
    setReadItems(newReadItems);
    saveReadItems(newReadItems);
  };

  const isStatusUnread = (itemId) => {
    return !readItems.has(itemId);
  };

  const isMessageUnread = (item) => {
    if (!item._lastAdminMsgId) return false;
    return lastReadMsgMap[item._id] !== item._lastAdminMsgId;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Under Review': return '#3B82F6';
      case 'Resolved':     return '#10B981';
      case 'Rejected':     return '#EF4444';
      default:             return '#F59E0B';
    }
  };

  const handleStatusPress = (item) => {
    markAsRead(`status-${item._id}`);
    navigation.navigate('FeedbackDetail', { feedbackId: item._id });
  };

  const handleMessagePress = async (item) => {
    if (item._lastAdminMsgId) {
      await saveLastReadMessage(item._id, item._lastAdminMsgId);
      setLastReadMsgMap(prev => ({ ...prev, [item._id]: item._lastAdminMsgId }));
    }
    navigation.navigate('Chat', { feedbackId: item._id });
  };

  const renderStatusNotification = ({ item }) => (
    <TouchableOpacity onPress={() => handleStatusPress(item)}>
      <View style={styles.notificationCard}>
        {isStatusUnread(`status-${item._id}`) && (
          <View style={styles.unreadIndicator} />
        )}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            Status Updated:{' '}
            <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </Text>
          <Text style={styles.subject} numberOfLines={2}>{item.subject}</Text>
          <Text style={styles.date}>
            {new Date(item.updatedAt).toLocaleDateString()} at{' '}
            {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMessageNotification = ({ item }) => (
    <TouchableOpacity onPress={() => handleMessagePress(item)}>
      <View style={styles.notificationCard}>
        {isMessageUnread(item) && (
          <View style={styles.unreadIndicator} />
        )}
        <View style={styles.contentContainer}>
          <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
          {item._lastAdminMsgText && (
            <Text style={[styles.messagePreview, !isMessageUnread(item) && styles.messagePreviewRead]} numberOfLines={1}>
              {item._lastAdminMsgText}
            </Text>
          )}
          <Text style={styles.date}>
            {new Date(item.adminResponse.respondedAt).toLocaleDateString()} at{' '}
            {new Date(item.adminResponse.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6D28D9" />
        </View>
      </View>
    );
  }

  const currentNotifications = activeTab === 'status' ? statusNotifications : messageNotifications;
  const unreadStatusCount = statusNotifications.filter(item => isStatusUnread(`status-${item._id}`)).length;
  const unreadMessageCount = messageNotifications.filter(item => isMessageUnread(item)).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'status' && styles.activeTab]}
          onPress={() => setActiveTab('status')}
        >
          <Text style={[styles.tabText, activeTab === 'status' && styles.activeTabText]}>Status Updates</Text>
          {unreadStatusCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadStatusCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>Messages</Text>
          {unreadMessageCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadMessageCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {currentNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{activeTab === 'status' ? '📊' : '💬'}</Text>
          <Text style={styles.emptyText}>No {activeTab === 'status' ? 'status updates' : 'messages'} yet</Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'status' ? "You'll see status changes here" : "Admin messages will appear here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentNotifications}
          renderItem={activeTab === 'status' ? renderStatusNotification : renderMessageNotification}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6D28D9" />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 10 },
  backArrow: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#f5f5f5', padding: 4, marginHorizontal: 16, marginTop: 16, borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, color: '#666', fontWeight: '600' },
  activeTabText: { color: '#6D28D9' },
  badge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16 },
  notificationCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, minHeight: 85, position: 'relative' },
  unreadIndicator: { position: 'absolute', top: 12, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  contentContainer: { flex: 1, justifyContent: 'space-between' },
  title: { fontSize: 14, color: '#666', marginBottom: 4 },
  status: { fontWeight: 'bold' },
  subject: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4, flex: 1 },
  messagePreview: { fontSize: 13, color: '#1a1a2e', fontWeight: '500', marginBottom: 6 },
  messagePreviewRead: { color: '#999', fontWeight: '400' },
  date: { fontSize: 12, color: '#999' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
});

export default NotificationsScreen;