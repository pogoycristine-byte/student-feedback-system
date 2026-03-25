import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const ContactSupportScreen = ({ navigation }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in both subject and message.');
      return;
    }
    setLoading(true);
    try {
      // huhays call your API to send support message
      // await supportAPI.send({ subject, message });
      Alert.alert('Message Sent!', 'Our support team will get back to you shortly.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Support</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>📩</Text>
          <Text style={styles.heroTitle}>Send us a message</Text>
          <Text style={styles.heroSub}>We typically respond within 24 hours.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="What's your concern about?"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue in detail..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity onPress={handleSend} disabled={loading} activeOpacity={0.85} style={{ marginTop: 20 }}>
          <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>{loading ? 'Sending...' : 'Send Message ✈️'}</Text>
          </LinearGradient>
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
  heroTitle: { fontSize: 18, fontWeight: 'bold', color: '#4C1D95', marginBottom: 4 },
  heroSub: { fontSize: 13, color: '#6D28D9' },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  fieldGroup: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { fontSize: 15, color: '#1F2937', paddingVertical: 8 },
  textArea: { minHeight: 100, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  sendButton: { borderRadius: 16, padding: 18, alignItems: 'center', justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ContactSupportScreen;