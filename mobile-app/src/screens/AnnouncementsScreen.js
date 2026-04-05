import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { announcementAPI } from '../services/api';

const SEEN_ANNOUNCEMENTS_KEY = 'seen_announcement_ids';

const AnnouncementsScreen = ({ navigation }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seenIds, setSeenIds] = useState(new Set());

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementAPI.getActive();
      const fetched = res.data.announcements || [];
      setAnnouncements(fetched);

      const raw = await AsyncStorage.getItem(SEEN_ANNOUNCEMENTS_KEY);
      const existingIds = new Set(raw ? JSON.parse(raw) : []);
      setSeenIds(new Set(existingIds));

      fetched.forEach(a => existingIds.add(a._id));
      await AsyncStorage.setItem(SEEN_ANNOUNCEMENTS_KEY, JSON.stringify([...existingIds]));
    } catch {}
    finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent={true} backgroundColor="transparent" barStyle="light-content" />

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
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Announcements</Text>
            <Text style={styles.headerSub}>
              {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
              {announcements.filter(a => !seenIds.has(a._id)).length > 0
                ? ` · ${announcements.filter(a => !seenIds.has(a._id)).length} new`
                : ''}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#6D28D9" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6D28D9"
              colors={['#6D28D9', '#BE185D']}
            />
          }
        >
          {announcements.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No announcements yet</Text>
              <Text style={styles.emptySub}>Check back later for updates from your school.</Text>
            </View>
          ) : (
            announcements.map((item) => {
              const isNew = !seenIds.has(item._id);
              return (
                <View key={item._id} style={[styles.card, isNew && styles.cardNew]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardMeta}>
                      <View style={styles.cardTitleRow}>
                        <Text style={[styles.cardTitle, isNew && styles.cardTitleNew]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {isNew && <View style={styles.redDot} />}
                      </View>
                      <Text style={styles.cardDate}>
                        {formatDate(item.createdAt)}
                        {item.createdBy?.name ? ` · ${item.createdBy.name}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardMessage}>{item.message}</Text>
                  {isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F8' },
  header: {
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 10 },
  backArrow: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: '#fff', opacity: 0.85, marginTop: 2 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  emptySub: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardNew: {
    borderColor: '#C4B5FD',
    backgroundColor: '#FAFAFF',
    shadowColor: '#6D28D9',
    shadowOpacity: 0.08,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  cardMeta: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#555', flex: 1 },
  cardTitleNew: { fontWeight: 'bold', color: '#1a1a2e' },
  cardDate: { fontSize: 12, color: '#999' },
  cardMessage: { fontSize: 13, color: '#555', lineHeight: 20 },

  // Red dot
  redDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },

  // NEW badge
  newBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default AnnouncementsScreen;