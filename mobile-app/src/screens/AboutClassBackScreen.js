import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const AboutClassBackScreen = ({ navigation }) => (
  <View style={styles.container}>
    <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About ClassBack</Text>
      </View>
    </LinearGradient>

    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Logo */}
      <View style={styles.logoSection}>
        <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>📋</Text>
        </LinearGradient>
        <Text style={styles.appName}>ClassBack</Text>
        <Text style={styles.tagline}>Classroom Feedback & Suggestion System</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </View>

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What is ClassBack?</Text>
        <Text style={styles.cardText}>
          ClassBack is a digital platform designed to bridge the communication gap between students and school administrators. It empowers students to voice their concerns, share suggestions, and track their feedback in real time.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Key Features</Text>
        {[
          { icon: '📝', label: 'Submit Feedback', desc: 'Easily submit concerns or suggestions' },
          { icon: '📊', label: 'Track Status', desc: 'Monitor your submission in real time' },
          { icon: '💬', label: 'Direct Messaging', desc: 'Chat with admins about your feedback' },
          { icon: '🔔', label: 'Notifications', desc: 'Get notified on every status update' },

        ].map((f, i) => (
          <View key={i} style={[styles.featureRow, i < 3 && styles.featureBorder]}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Credits */}
      <View style={[styles.card, { alignItems: 'center' }]}>
        <Text style={styles.cardTitle}>Developed with ❤️</Text>
        <Text style={styles.cardText}>Built to empower student voices and improve the school experience for everyone.</Text>
      </View>

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
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  logoSection: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 80, height: 80, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  tagline: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  versionBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  versionText: { fontSize: 12, fontWeight: '600', color: '#6D28D9' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  cardText: { fontSize: 13, color: '#6B7280', lineHeight: 21 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  featureBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  featureIcon: { fontSize: 24 },
  featureLabel: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  featureDesc: { fontSize: 12, color: '#9CA3AF' },
});

export default AboutClassBackScreen;