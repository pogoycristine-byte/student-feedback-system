import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { feedbackAPI } from '../services/api';

const getStatusColors = (status) => {
  switch (status) {
    case 'Pending':       return ['#F59E0B', '#F97316'];
    case 'Under Review':  return ['#3B82F6', '#2563EB'];
    case 'Resolved':      return ['#10B981', '#059669'];
    case 'Rejected':      return ['#EF4444', '#DC2626'];
    default:              return ['#6B7280', '#4B5563'];
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'High':    return '#EF4444';
    case 'Medium':  return '#F59E0B';
    case 'Low':     return '#10B981';
    default:        return '#6B7280';
  }
};

const FeedbackDetailScreen = ({ route, navigation }) => {
  const { feedbackId } = route.params;
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ═══ NEW: Rating Modal State ═══
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await feedbackAPI.getById(feedbackId);
      setFeedback(response.data.feedback);
    } catch (error) {
      Alert.alert('Error', 'Failed to load feedback details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ═══ NEW: Check if feedback needs rating ═══
  const needsRating = () => {
    return (
      feedback?.status === 'Resolved' && 
      !feedback?.satisfactionRating
    );
  };

  // ═══ NEW: Handle rating submission ═══
  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Required', 'Please select a rating');
      return;
    }

    setSubmittingRating(true);
    try {
      await feedbackAPI.submitRating(feedbackId, {
        satisfactionRating: rating,
        satisfactionComment: ratingComment,
      });
      
      Alert.alert('Success', 'Thank you for your feedback!', [
        {
          text: 'OK',
          onPress: () => {
            setShowRatingModal(false);
            setRating(0);
            setRatingComment('');
            fetchFeedback(); // Refresh to show rating
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  // ═══ NEW: Render star rating ═══
  const renderStars = (interactive = false) => {
    const stars = [];
    const displayRating = interactive ? rating : (feedback?.satisfactionRating || 0);
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity 
          key={i} 
          onPress={() => interactive && setRating(i)}
          disabled={!interactive}
        >
          <Text style={interactive ? styles.starInteractive : styles.starDisplay}>
            {i <= displayRating ? '⭐' : '☆'}
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6D28D9" />
      </View>
    );
  }

  if (!feedback) return null;

  return (
    <View style={styles.wrapper}>
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
          <Text style={styles.headerTitle}>Feedback Detail</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          {/* Subject & Meta */}
          <View style={styles.card}>
            <Text style={styles.subject}>{feedback.subject}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Category</Text>
              <Text style={styles.metaValue}>
                {feedback.category?.icon} {feedback.category?.name}
              </Text>
            </View>

            {feedback.teacherName ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Teacher</Text>
                <Text style={styles.metaValue}>{feedback.teacherName}</Text>
              </View>
            ) : null}

            {/* Status */}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status</Text>
              <LinearGradient
                colors={getStatusColors(feedback.status)}
                style={styles.statusBadge}
              >
                <Text style={styles.statusBadgeText}>{feedback.status}</Text>
              </LinearGradient>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Priority</Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(feedback.priority) }]}>
                <Text style={styles.priorityText}>{feedback.priority}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Submitted</Text>
              <Text style={styles.metaValue}>
                {new Date(feedback.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{feedback.description}</Text>
          </View>

          {/* Media - FIXED */}
          {feedback.media && feedback.media.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Attached Media</Text>
              <View style={styles.mediaGrid}>
                {feedback.media.map((file, index) => (
                  <View key={index} style={styles.mediaItem}>
                    <Image
                      source={{ uri: file.url }}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                    {file.type === 'video' && (
                      <View style={styles.videoOverlay}>
                        <Text style={styles.videoIcon}>🎥</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Admin Response */}
          {feedback.adminResponse?.comment ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Admin Response</Text>
              <View style={styles.responseBox}>
                <Text style={styles.responseText}>{feedback.adminResponse.comment}</Text>
                {feedback.adminResponse.respondedAt && (
                  <Text style={styles.responseDate}>
                    {new Date(feedback.adminResponse.respondedAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Admin Response</Text>
              <Text style={styles.noResponse}>No response yet. We'll get back to you soon!</Text>
            </View>
          )}

          {/* ═══ NEW: RATING SECTION ═══ */}
          {feedback.status === 'Resolved' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>⭐ Resolution Rating</Text>
              
              {feedback.satisfactionRating ? (
                // Show existing rating
                <View style={styles.ratingDisplay}>
                  <View style={styles.starsContainer}>
                    {renderStars(false)}
                  </View>
                  <Text style={styles.ratingValue}>
                    {feedback.satisfactionRating === 1 && '😞 Very Unsatisfied'}
                    {feedback.satisfactionRating === 2 && '😕 Unsatisfied'}
                    {feedback.satisfactionRating === 3 && '😐 Neutral'}
                    {feedback.satisfactionRating === 4 && '😊 Satisfied'}
                    {feedback.satisfactionRating === 5 && '🎉 Very Satisfied'}
                  </Text>
                  {feedback.satisfactionComment && (
                    <View style={styles.ratingCommentBox}>
                      <Text style={styles.ratingCommentLabel}>Your Comment:</Text>
                      <Text style={styles.ratingCommentText}>{feedback.satisfactionComment}</Text>
                    </View>
                  )}
                  {feedback.ratedAt && (
                    <Text style={styles.ratingDate}>
                      Rated on {new Date(feedback.ratedAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
              ) : (
                // Show "Rate This" button
                <View style={styles.ratingPrompt}>
                  <Text style={styles.ratingPromptText}>
                    How satisfied are you with the resolution?
                  </Text>
                  <TouchableOpacity onPress={() => setShowRatingModal(true)}>
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      style={styles.rateButton}
                    >
                      <Text style={styles.rateButtonText}>⭐ Rate This Resolution</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          {/* ═══ END RATING SECTION ═══ */}

          {/* Status History */}
          {feedback.statusHistory && feedback.statusHistory.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Status History</Text>
              {feedback.statusHistory.map((history, index) => (
                <View key={index} style={styles.historyItem}>
                  <LinearGradient
                    colors={getStatusColors(history.status)}
                    style={styles.historyDot}
                  />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyStatus}>{history.status}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(history.changedAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </Text>
                    {history.comment ? (
                      <Text style={styles.historyComment}>{history.comment}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* ═══ NEW: RATING MODAL — keyboard fix applied ═══ */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⭐ Rate This Resolution</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable content — user can scroll to Submit when keyboard is open */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalQuestion}>
                  How satisfied are you with the resolution?
                </Text>

                {/* Stars */}
                <View style={styles.starsContainer}>
                  {renderStars(true)}
                </View>

                {/* Rating Labels */}
                <View style={styles.ratingLabels}>
                  <Text style={styles.ratingLabel}>Poor</Text>
                  <Text style={styles.ratingLabel}>Excellent</Text>
                </View>

                {/* Selected Rating Text */}
                {rating > 0 && (
                  <Text style={styles.selectedRating}>
                    {rating === 1 && '😞 Very Unsatisfied'}
                    {rating === 2 && '😕 Unsatisfied'}
                    {rating === 3 && '😐 Neutral'}
                    {rating === 4 && '😊 Satisfied'}
                    {rating === 5 && '🎉 Very Satisfied'}
                  </Text>
                )}

                {/* Comment */}
                <Text style={styles.commentLabel}>
                  Additional Comments (Optional)
                </Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Tell us more about your experience..."
                  placeholderTextColor="#999"
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {/* Submit Button */}
                <TouchableOpacity onPress={handleSubmitRating} disabled={submittingRating}>
                  <LinearGradient
                    colors={['#6D28D9', '#BE185D']}
                    style={styles.submitButton}
                  >
                    <Text style={styles.submitButtonText}>
                      {submittingRating ? 'Submitting...' : 'Submit Rating'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Skip Button */}
                <TouchableOpacity 
                  style={styles.skipButton} 
                  onPress={() => setShowRatingModal(false)}
                >
                  <Text style={styles.skipButtonText}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* ═══ END RATING MODAL ═══ */}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f5f5f5' },
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  subject: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  metaLabel: { fontSize: 14, color: '#999', fontWeight: '500' },
  metaValue: { fontSize: 14, color: '#1a1a2e', fontWeight: '600' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  priorityText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 12 },
  description: { fontSize: 15, color: '#444', lineHeight: 24 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaItem: { width: '48%', position: 'relative' },
  mediaImage: { width: '100%', height: 140, borderRadius: 10 },
  videoOverlay: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: 4 },
  videoIcon: { fontSize: 16 },
  responseBox: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#10B981' },
  responseText: { fontSize: 15, color: '#1a1a2e', lineHeight: 22 },
  responseDate: { fontSize: 12, color: '#999', marginTop: 8 },
  noResponse: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  historyItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  historyDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 12 },
  historyContent: { flex: 1 },
  historyStatus: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
  historyDate: { fontSize: 12, color: '#999', marginTop: 2 },
  historyComment: { fontSize: 13, color: '#666', marginTop: 4 },

  // ═══ NEW: RATING STYLES ═══
  ratingDisplay: {
    alignItems: 'center',
  },
  ratingPrompt: {
    alignItems: 'center',
  },
  ratingPromptText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  rateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 2,
  },
  starInteractive: {
    fontSize: 32,
  },
  starDisplay: {
    fontSize: 30,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6D28D9',
    marginTop: 8,
  },
  ratingCommentBox: {
    backgroundColor: '#f8f4ff',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    width: '100%',
  },
  ratingCommentLabel: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingCommentText: {
    fontSize: 14,
    color: '#1a1a2e',
    lineHeight: 20,
  },
  ratingDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  modalQuestion: {
    fontSize: 16,
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '600',
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#999',
  },
  selectedRating: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6D28D9',
    textAlign: 'center',
    marginBottom: 6,
  },
  commentLabel: {
    fontSize: 13,
    color: '#1a1a2e',
    marginBottom: 4,
    fontWeight: '600',
  },
  commentInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    color: '#1a1a2e',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 65,
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
  },
});

export default FeedbackDetailScreen;