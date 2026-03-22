import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { feedbackAPI } from '../services/api';

const STATUS_FILTERS = ['All', 'Pending', 'Under Review', 'Resolved', 'Rejected'];

const getStatusColor = (status) => {
  switch (status) {
    case 'Pending':      return ['#F59E0B', '#F97316'];
    case 'Under Review': return ['#3B82F6', '#2563EB'];
    case 'Resolved':     return ['#10B981', '#059669'];
    case 'Rejected':     return ['#EF4444', '#DC2626'];
    default:             return ['#6B7280', '#4B5563'];
  }
};

const getStatusSolid = (status) => {
  switch (status) {
    case 'Pending':      return '#F59E0B';
    case 'Under Review': return '#3B82F6';
    case 'Resolved':     return '#10B981';
    case 'Rejected':     return '#EF4444';
    default:             return '#6B7280';
  }
};

const MyFeedbackScreen = ({ navigation }) => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await feedbackAPI.getMyFeedback();
      setFeedback(response.data.feedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeedback();
  };

  // Filtered + searched list
  const filteredFeedback = useMemo(() => {
    let list = feedback;
    if (activeFilter !== 'All') {
      list = list.filter((f) => f.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.subject?.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q) ||
          f.category?.name?.toLowerCase().includes(q) ||
          f.teacherName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [feedback, activeFilter, searchQuery]);

  const renderFeedbackItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate('FeedbackDetail', { feedbackId: item._id })}
    >
      <View style={styles.feedbackCard}>
        <View style={styles.feedbackHeader}>
          <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
          <LinearGradient
            colors={getStatusColor(item.status)}
            style={styles.statusBadge}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </LinearGradient>
        </View>

        <View style={styles.categoryRow}>
          <Text style={styles.categoryText}>
            {item.category?.icon} {item.category?.name}
          </Text>
          {item.teacherName && (
            <Text style={styles.teacherText}>• {item.teacherName}</Text>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.date}>
            🗓 {new Date(item.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </Text>
          {item.statusHistory && item.statusHistory.length > 0 && (
            <Text style={styles.historyBadge}>
              {item.statusHistory.length} update{item.statusHistory.length > 1 ? 's' : ''}
            </Text>
          )}
          <Text style={styles.viewDetail}>View →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by subject, category, teacher…"
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((s) => {
          const active = activeFilter === s;
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.filterChip,
                active && { backgroundColor: s === 'All' ? '#6D28D9' : getStatusSolid(s) },
              ]}
              onPress={() => setActiveFilter(s)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Result count */}
      <Text style={styles.resultCount}>
        {filteredFeedback.length} result{filteredFeedback.length !== 1 ? 's' : ''}
        {activeFilter !== 'All' ? ` · ${activeFilter}` : ''}
        {searchQuery ? ` · "${searchQuery}"` : ''}
      </Text>
    </>
  );

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
            <Text style={styles.title}>My Feedback</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6D28D9" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.title}>My Feedback</Text>
            <Text style={styles.subtitle}>{feedback.length} total submission{feedback.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </LinearGradient>

      {feedback.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>No feedback yet</Text>
          <Text style={styles.emptySubtext}>Submit your first feedback!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFeedback}
          renderItem={renderFeedbackItem}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.noResultContainer}>
              <Text style={styles.noResultIcon}>🔎</Text>
              <Text style={styles.noResultText}>No matches found</Text>
              <Text style={styles.noResultSub}>Try a different search or filter</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6D28D9"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  backArrow: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.85,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a2e',
    padding: 0,
  },
  clearBtn: {
    fontSize: 14,
    color: '#999',
    paddingLeft: 8,
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e8e8e8',
  },
  filterChipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Result count
  resultCount: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
    fontStyle: 'italic',
  },

  // Feedback card
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subject: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
  },
  teacherText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
    gap: 8,
  },
  date: {
    fontSize: 11,
    color: '#999',
    flex: 1,
  },
  historyBadge: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '600',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  viewDetail: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '700',
  },

  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
  },
  noResultContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  noResultIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noResultText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  noResultSub: {
    fontSize: 14,
    color: '#999',
  },
});

export default MyFeedbackScreen;