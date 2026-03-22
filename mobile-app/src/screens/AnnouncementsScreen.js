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
import { announcementAPI } from '../services/api';

const AnnouncementsScreen = ({ navigation }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementAPI.getActive();
      setAnnouncements(res.data.announcements || []);
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

      {/* Header */}
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
          <View>
            <Text style={styles.headerTitle}>Announcements</Text>
            <Text style={styles.headerSub}>{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</Text>
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
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No announcements yet</Text>
              <Text style={styles.emptySub}>Check back later for updates from your school.</Text>
            </View>
          ) : (
            announcements.map((item, index) => (
              <View key={item._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Text style={styles.icon}>📣</Text>
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDate}>
                      {formatDate(item.createdAt)}
                      {item.createdBy?.name ? ` · ${item.createdBy.name}` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMessage}>{item.message}</Text>
              </View>
            ))
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
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  emptySub: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },
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
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 16 },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 2 },
  cardDate: { fontSize: 12, color: '#999' },
  cardMessage: { fontSize: 13, color: '#555', lineHeight: 20 },
});

export default AnnouncementsScreen;