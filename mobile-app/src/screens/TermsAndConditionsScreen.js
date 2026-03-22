import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const sections = [
  { title: '1. Acceptance of Terms', content: 'By using ClassBack, you agree to these Terms and Conditions. If you do not agree, please do not use the application.' },
  { title: '2. Use of the Application', content: 'ClassBack is intended for students and staff to submit and manage academic feedback. You agree to use this platform only for its intended educational purpose and not for any unlawful activity.' },
  { title: '3. User Accounts', content: 'You are responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility. Report unauthorized access immediately.' },
  { title: '4. Feedback Submissions', content: 'All feedback submitted must be honest, respectful, and relevant to academic matters. Offensive, defamatory, or false submissions may be removed and may result in account suspension.' },
  { title: '5. Privacy', content: 'We collect minimal personal information solely for the purpose of operating the feedback system. Your data will not be shared with third parties without your consent, except as required by school administration.' },
  { title: '6. Modifications', content: 'ClassBack reserves the right to update these terms at any time. Continued use of the application after changes constitutes acceptance of the new terms.' },
  { title: '7. Contact', content: 'For questions about these terms, please contact your school administrator or reach us via the Contact Support page.' },
];

const TermsAndConditionsScreen = ({ navigation }) => (
  <View style={styles.container}>
    <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
      </View>
    </LinearGradient>

    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.introCard}>
        <Text style={styles.introEmoji}>📜</Text>
        <Text style={styles.introTitle}>Terms & Conditions</Text>
        <Text style={styles.introDate}>Last updated: January 2025</Text>
      </View>

      {sections.map((s, i) => (
        <View key={i} style={styles.section}>
          <Text style={styles.sectionTitle}>{s.title}</Text>
          <Text style={styles.sectionContent}>{s.content}</Text>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 10 },
  backArrow: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  introCard: { backgroundColor: '#EDE9FE', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  introEmoji: { fontSize: 40, marginBottom: 8 },
  introTitle: { fontSize: 18, fontWeight: 'bold', color: '#4C1D95', marginBottom: 4 },
  introDate: { fontSize: 12, color: '#6D28D9' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  sectionContent: { fontSize: 13, color: '#6B7280', lineHeight: 21 },
});

export default TermsAndConditionsScreen;