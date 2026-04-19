import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { supportAPI } from '../services/api';

const faqs = [
  { q: 'How do I submit feedback?', a: 'Tap the "Create New Feedback" button on the Home screen or go to the Feedback tab and fill out the form.' },
  { q: 'How do I track my submission?', a: 'Go to My Feedback to see all your submissions and their current status (Pending, Under Review, Resolved, Rejected).' },
  { q: 'How will I know if my feedback is resolved?', a: 'You will receive a notification in the Notifications tab when your feedback status changes.' },
  { q: 'Can I message the admin?', a: 'Yes! Open a feedback item and scroll down to the message section to chat with the admin.' },
  { q: 'Can I submit feedback anonymously?', a: 'Yes, you can choose to submit anonymously when filling out the feedback form.' },
  { q: 'What happens after I submit?', a: 'An admin or staff member will review your feedback and update its status. You will be notified of any changes.' },
];

const HelpCenterScreen = ({ navigation }) => {
  const [openIndex, setOpenIndex] = useState(null);
const { user } = useAuth();
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help Center</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🙋</Text>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>Find answers to common questions below.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ContactSupport')} style={styles.heroContactButton}>
            <Text style={styles.heroContactLink}>Contact Support →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>

        {faqs.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.faqItem}
            onPress={() => setOpenIndex(openIndex === i ? null : i)}
            activeOpacity={0.8}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQ}>{item.q}</Text>
              <Text style={styles.faqChevron}>{openIndex === i ? '∧' : '∨'}</Text>
            </View>
            {openIndex === i && <Text style={styles.faqA}>{item.a}</Text>}
          </TouchableOpacity>
        ))}

        {/* ── My Support Messages ── */}
        <TouchableOpacity
          style={styles.myMessagesBox}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('StudentSupportChat')}
        >
          <View style={styles.myMessagesLeft}>
            <Text style={styles.myMessagesEmoji}>💬</Text>
            <View>
              <Text style={styles.myMessagesTitle}>My Support Messages</Text>
              <Text style={styles.myMessagesSub}>View your past support conversations</Text>
            </View>
          </View>
          <Text style={styles.myMessagesArrow}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 10 },
  backArrow: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  heroCard: { backgroundColor: '#EDE9FE', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  heroEmoji: { fontSize: 40, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: 'bold', color: '#4C1D95', marginBottom: 4 },
  heroSub: { fontSize: 13, color: '#6D28D9', textAlign: 'center' },
  heroContactButton: { marginTop: 12 },
  heroContactLink: { fontSize: 14, fontWeight: '700', color: '#6D28D9' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  faqItem: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: 14, fontWeight: '600', color: '#1F2937', flex: 1, paddingRight: 8 },
  faqChevron: { fontSize: 14, color: '#6D28D9', fontWeight: 'bold' },
  faqA: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  myMessagesBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  myMessagesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myMessagesEmoji: { fontSize: 24, marginRight: 4 },
  myMessagesTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  myMessagesSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  myMessagesArrow: { fontSize: 22, color: '#6D28D9', fontWeight: 'bold' },
});

export default HelpCenterScreen;