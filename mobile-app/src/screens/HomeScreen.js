import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { feedbackAPI, announcementAPI } from '../services/api';
import ToastNotification from '../components/ToastNotification';

const READ_NOTIFICATIONS_KEY = 'readNotifications';
const LAST_READ_MSG_KEY = 'studentLastReadMsgId';
const BANNER_VISIBLE_DURATION = 10000; // 10 seconds

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [toast, setToast] = useState(null);
  const bannerTimeoutRef = useRef(null);
  const lastSeenStatus = useRef({});
  const lastSeenMsg = useRef({});
  const toastQueue = useRef([]);
  const isShowingToast = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    fetchFeedbackCount();
    initLastSeen();
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setAnnouncementIndex(prev => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements]);

  useFocusEffect(
    useCallback(() => {
      checkUnreadNotifications();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(pollForUpdates, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementAPI.getActive();
      const newAnnouncements = res.data.announcements || [];
      const hadAnnouncements = announcements.length > 0;
      const hasNewAnnouncements = newAnnouncements.length > 0;
      
      setAnnouncements(newAnnouncements);
      setAnnouncementIndex(0);
      
      // Show banner if there are announcements
      if (hasNewAnnouncements) {
        setShowBanner(true);
        
        // Clear existing timeout
        if (bannerTimeoutRef.current) {
          clearTimeout(bannerTimeoutRef.current);
        }
        
        // Set timeout to hide banner after 10 seconds
        bannerTimeoutRef.current = setTimeout(() => {
          setShowBanner(false);
        }, BANNER_VISIBLE_DURATION);
      }
    } catch {}
  };

  const initLastSeen = async () => {
    try {
      const savedMsgMap = await AsyncStorage.getItem(LAST_READ_MSG_KEY);
      const lastReadMsgMap = savedMsgMap ? JSON.parse(savedMsgMap) : {};
      const response = await feedbackAPI.getMyFeedback();
      const allFeedback = response.data.feedback || [];
      allFeedback.forEach(item => { lastSeenStatus.current[item._id] = item.status; });
      lastSeenMsg.current = { ...lastReadMsgMap };
      initialized.current = true;
    } catch {}
  };

  const pollForUpdates = async () => {
    if (!initialized.current) return;
    try {
      const response = await feedbackAPI.getMyFeedback();
      const allFeedback = response.data.feedback || [];
      for (const item of allFeedback) {
        const prevStatus = lastSeenStatus.current[item._id];
        if (prevStatus && prevStatus !== item.status) {
          lastSeenStatus.current[item._id] = item.status;
          enqueueToast({ type: 'status', feedbackId: item._id, subject: item.subject, status: item.status });
        } else if (!prevStatus) {
          lastSeenStatus.current[item._id] = item.status;
        }
        if (item.adminResponse?.comment) {
          try {
            const msgRes = await feedbackAPI.getMessages(item._id);
            const messages = msgRes.data.messages || [];
            const lastAdminMsg = [...messages].reverse().find(m => m.senderRole === 'admin' || m.senderRole === 'staff');
            if (lastAdminMsg && lastSeenMsg.current[item._id] !== lastAdminMsg._id) {
              lastSeenMsg.current[item._id] = lastAdminMsg._id;
              enqueueToast({ type: 'message', feedbackId: item._id, subject: item.subject, preview: lastAdminMsg.message });
            }
          } catch {}
        }
      }
    } catch {}
  };

  const enqueueToast = (toastData) => {
    toastQueue.current.push(toastData);
    if (!isShowingToast.current) showNextToast();
  };

  const showNextToast = () => {
    if (toastQueue.current.length === 0) { isShowingToast.current = false; return; }
    isShowingToast.current = true;
    setToast(toastQueue.current.shift());
  };

  const handleToastDismiss = () => {
    setToast(null);
    setTimeout(showNextToast, 400);
  };

  const handleToastPress = (t) => {
    setToast(null);
    isShowingToast.current = false;
    toastQueue.current = [];
    if (t.type === 'message') {
      navigation.navigate('Chat', { feedbackId: t.feedbackId });
    } else {
      navigation.navigate('FeedbackDetail', { feedbackId: t.feedbackId });
    }
  };

  const fetchFeedbackCount = async () => {
    try {
      const response = await feedbackAPI.getMyFeedback();
      setFeedbackCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching feedback count:', error);
    }
  };

  const checkUnreadNotifications = async () => {
    try {
      const response = await feedbackAPI.getMyFeedback();
      const allFeedback = response.data.feedback || [];
      const saved = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
      const readItems = new Set(saved ? JSON.parse(saved) : []);
      const savedMsgMap = await AsyncStorage.getItem(LAST_READ_MSG_KEY);
      const lastReadMsgMap = savedMsgMap ? JSON.parse(savedMsgMap) : {};
      const hasUnreadStatus = allFeedback
        .filter((item) => item.status !== 'Pending')
        .some((item) => !readItems.has(`status-${item._id}`));
      let hasUnreadMessages = false;
      for (const item of allFeedback.filter((i) => i.adminResponse?.comment)) {
        try {
          const msgRes = await feedbackAPI.getMessages(item._id);
          const messages = msgRes.data.messages || [];
          const lastAdminMsg = [...messages].reverse().find(m => m.senderRole === 'admin' || m.senderRole === 'staff');
          if (lastAdminMsg && lastReadMsgMap[item._id] !== lastAdminMsg._id) {
            hasUnreadMessages = true;
            break;
          }
        } catch {}
      }
      setHasUnreadNotifications(hasUnreadStatus || hasUnreadMessages);
    } catch (error) {
      console.error('Error checking unread notifications:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchFeedbackCount(), checkUnreadNotifications(), fetchAnnouncements()]);
    setRefreshing(false);
  }, []);

  const handleNotificationsPress = () => {
    setHasUnreadNotifications(false);
    navigation.navigate('Notifications');
  };

  const currentAnnouncement = announcements[announcementIndex];

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        <StatusBar translucent={true} backgroundColor="transparent" barStyle="light-content" />

        {/* Header */}
        <LinearGradient
          colors={['#6D28D9', '#BE185D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6D28D9"
              colors={['#6D28D9', '#BE185D']}
            />
          }
        >
          {/* Banner - Shows rotating announcements for 10 seconds, then shows button */}
          {showBanner && announcements.length > 0 ? (
            <TouchableOpacity 
              style={styles.announcementBanner}
              onPress={() => navigation.navigate('Announcements')}
              activeOpacity={0.9}
            >
              <View style={styles.announcementIconWrap}>
                <Text style={styles.announcementIcon}>📣</Text>
              </View>
              <View style={styles.announcementContent}>
                <Text style={styles.announcementTitle} numberOfLines={1}>
                  {currentAnnouncement.title}
                </Text>
                <Text style={styles.announcementText} numberOfLines={2}>
                  {currentAnnouncement.message}
                </Text>
              </View>
              {announcements.length > 1 && (
                <View style={styles.announcementDots}>
                  {announcements.map((_, i) => (
                    <View key={i} style={[styles.dot, i === announcementIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.headerBanner}
              onPress={() => navigation.navigate('Announcements')}
            >
              <Text style={styles.bannerIcon}>📣</Text>
              <Text style={styles.bannerText}>Announcements</Text>
              <Text style={styles.bannerArrow}>→</Text>
            </TouchableOpacity>
          )}

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: '#6D28D9' }]}>
              <Text style={styles.statValue}>{feedbackCount}</Text>
              <Text style={styles.statKey}>Total{'\n'}Submitted</Text>
            </View>
            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: '#BE185D' }]}
              onPress={() => navigation.navigate('Notifications', { initialTab: 'messages' })}
            >
              <Text style={styles.statValue}>📬</Text>
              <Text style={styles.statKey}>Check{'\n'}Responses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: '#7C3AED' }]}
              onPress={() => navigation.navigate('Notifications', { initialTab: 'status' })}
            >
              <Text style={styles.statValue}>🔔</Text>
              <Text style={styles.statKey}>View{'\n'}Alerts</Text>
            </TouchableOpacity>
          </View>

          {/* Create New Feedback Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('SubmitFeedback')}
          >
            <LinearGradient
              colors={['#6D28D9', '#BE185D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createCard}
            >
              <View style={styles.createCardInner}>
                <View style={styles.createCardLeft}>
                  <Text style={styles.createCardEyebrow}>NEW</Text>
                  <Text style={styles.createCardTitle}>Improve Our{'\n'}School Together</Text>
                  <Text style={styles.createCardSubtitle}>Submit your feedback to make a difference</Text>
                  <View style={styles.bulletsWrap}>
                    <View style={styles.bulletRow}>
                      <View style={styles.bulletCheck}><Text style={styles.bulletCheckText}>✓</Text></View>
                      <Text style={styles.bulletText}>Raise Concerns & Suggestions</Text>
                    </View>
                    <View style={styles.bulletRow}>
                      <View style={styles.bulletCheck}><Text style={styles.bulletCheckText}>✓</Text></View>
                      <Text style={styles.bulletText}>Share Positive Feedback</Text>
                    </View>
                  </View>
                  <View style={styles.createCardBtn}>
                    <Text style={styles.createCardBtnText}>Get Started →</Text>
                  </View>
                </View>
                <View style={styles.iconContainer}>
                  <Text style={styles.iconText}>✉️</Text>
                  <Text style={styles.bulbIcon}>💡</Text>
                  <View style={styles.plusCircle}>
                    <Text style={styles.plusIcon}>+</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Recent Feedback Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Feedback</Text>
            {feedbackCount > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('MyFeedback')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {feedbackCount === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyIcon}>📭</Text>
              </View>
              <Text style={styles.emptyTitle}>No submissions yet</Text>
              <Text style={styles.emptySubtext}>
                Submit your first feedback and track its status right here.
              </Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('MyFeedback')}>
              <View style={styles.feedbackCountCard}>
                <View style={styles.feedbackCountLeft}>
                  <Text style={styles.feedbackBigIcon}>📋</Text>
                  <View>
                    <Text style={styles.feedbackCountLabel}>
                      feedback submission{feedbackCount !== 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.feedbackSubLabel}>Tap to view all</Text>
                  </View>
                </View>
                <View style={styles.arrowCircle}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Motivation Section */}
          <View style={styles.motivationCard}>
            <Text style={styles.motivationIcon}>📚</Text>
            <Text style={styles.motivationText}>
              Your voice matters! Share your thoughts.
            </Text>
          </View>

          {/* How It Works */}
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsCard}>
            {[
              { step: '01', icon: '✏️', title: 'Submit', desc: 'Fill out the feedback form with details.' },
              { step: '02', icon: '👀', title: 'Review', desc: 'Admin reviews your submission.' },
              { step: '03', icon: '✅', title: 'Resolved', desc: 'Get notified when your concern is addressed.' },
            ].map((item, index) => (
              <View key={index} style={[styles.stepRow, index < 2 && styles.stepRowBorder]}>
                <View style={styles.stepNumWrap}>
                  <Text style={styles.stepNum}>{item.step}</Text>
                </View>
                <Text style={styles.stepIcon}>{item.icon}</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{item.title}</Text>
                  <Text style={styles.stepDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity onPress={() => navigation.navigate('SubmitFeedback')}>
            <LinearGradient
              colors={['#6D28D9', '#BE185D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Submit a feedback now</Text>
              <Text style={styles.submitButtonIcon}>✈️</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIconActive}>🏠</Text>
            <Text style={styles.navLabelActive}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MyFeedback')}>
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navLabel}>Feedback</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={handleNotificationsPress}>
            <View style={styles.navIconWrapper}>
              <Text style={styles.navIcon}>🔔</Text>
              {hasUnreadNotifications && <View style={styles.redDot} />}
            </View>
            <Text style={styles.navLabel}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.navIcon}>👤</Text>
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ToastNotification
        toast={toast}
        onDismiss={handleToastDismiss}
        onPress={handleToastPress}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F8' },
  header: {
    paddingTop: (StatusBar.currentHeight || 44) + 10,
    paddingBottom: 14, paddingHorizontal: 24, overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -50,
  },
  decorCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, right: 80,
  },
  welcomeText: { fontSize: 11, color: '#fff', opacity: 0.9, marginBottom: 2 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  announcementBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#4C1D95',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 20, gap: 10, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  announcementIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(167,139,250,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  announcementIcon: { fontSize: 18 },
  announcementContent: { flex: 1 },
  announcementTitle: { fontSize: 13, fontWeight: 'bold', color: '#EDE9FE', marginBottom: 2 },
  announcementText: { fontSize: 12, color: 'rgba(237,233,254,0.75)', lineHeight: 17 },
  announcementDots: { flexDirection: 'column', gap: 4, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(237,233,254,0.3)' },
  dotActive: { backgroundColor: '#EDE9FE', height: 10, borderRadius: 3 },
  headerBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE',
    borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 20, gap: 10,
  },
  bannerIcon: { fontSize: 18 },
  bannerText: { fontSize: 13, color: '#4C1D95', flex: 1, lineHeight: 18, fontWeight: '600' },
  bannerArrow: { fontSize: 14, color: '#4C1D95', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 13, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 21, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 3 },
  statKey: { fontSize: 12, color: '#888', lineHeight: 14 },
  createCard: {
    borderRadius: 16, padding: 14, marginBottom: 20, overflow: 'hidden',
    shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  createCardInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  createCardLeft: { flex: 1, paddingRight: 8 },
  createCardEyebrow: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2, marginBottom: 2,
  },
  createCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', lineHeight: 21, marginBottom: 2 },
  createCardSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 8, lineHeight: 14 },
  bulletsWrap: { marginBottom: 10, gap: 5 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bulletCheck: {
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center',
  },
  bulletCheckText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  bulletText: { fontSize: 10, color: '#fff', fontWeight: '500' },
  createCardBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  createCardBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  iconContainer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', position: 'relative', marginLeft: 6,
  },
  iconText: { fontSize: 52 },
  bulbIcon: { fontSize: 38, marginLeft: -6 },
  plusCircle: {
    position: 'absolute', top: -4, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  plusIcon: { fontSize: 13, color: '#6D28D9', fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#BE185D', fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#ebebeb',
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F4F4F8',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  emptyIcon: { fontSize: 30 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },
  feedbackCountCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1,
    borderColor: '#ebebeb', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  feedbackCountLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  feedbackBigIcon: { fontSize: 36 },
  feedbackCountLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  feedbackSubLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  arrowCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F4F8',
    justifyContent: 'center', alignItems: 'center',
  },
  arrowText: { fontSize: 16, color: '#6D28D9', fontWeight: 'bold' },
  motivationCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 12, marginBottom: 24, marginTop: 0,
    borderWidth: 1, borderColor: '#e9d5ff', borderLeftWidth: 4, borderLeftColor: '#6D28D9',
    shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  motivationIcon: { fontSize: 28, marginRight: 14 },
  motivationText: { fontSize: 14, color: '#333', flex: 1, lineHeight: 22, fontWeight: '500' },
  stepsCard: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 18,
    marginBottom: 24, borderWidth: 1, borderColor: '#ebebeb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  stepRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  stepNumWrap: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#EDE9FE',
    justifyContent: 'center', alignItems: 'center',
  },
  stepNum: { fontSize: 11, fontWeight: 'bold', color: '#6D28D9' },
  stepIcon: { fontSize: 22 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 2 },
  stepDesc: { fontSize: 12, color: '#888', lineHeight: 17 },
  submitButton: {
    borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
    shadowColor: '#BE185D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  submitButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginRight: 8 },
  submitButtonIcon: { fontSize: 18 },
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 8,
  },
  navItem: { alignItems: 'center', paddingVertical: 0, paddingBottom: 19 },
  navIconActive: { fontSize: 24, marginBottom: 4 },
  navIcon: { fontSize: 24, opacity: 0.4 },
  navLabelActive: { fontSize: 11, color: '#BE185D', fontWeight: 'bold' },
  navLabel: { fontSize: 11, color: '#999' },
  navIconWrapper: { position: 'relative', marginBottom: 4 },
  redDot: {
    position: 'absolute', top: -2, right: -4, width: 10, height: 10,
    borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#fff',
  },
});

export default HomeScreen;