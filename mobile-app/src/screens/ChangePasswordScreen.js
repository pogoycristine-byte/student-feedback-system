import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

// ── Field defined OUTSIDE component so it doesn't remount on every render ──
const Field = ({ label, value, onChangeText, placeholder, showPassword, onToggleShow }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={onToggleShow} style={styles.eyeBtn}>
        <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const ChangePasswordScreen = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password.');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const message = err.response?.data?.message || 'Incorrect current password or server error.';
      Alert.alert('Error', message);
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
          <Text style={styles.headerTitle}>Change Password</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🔒</Text>
          </View>
          <Text style={styles.iconSubtitle}>Choose a strong password to keep your account safe</Text>
        </View>

        <View style={styles.card}>
          <Field
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            showPassword={showCurrent}
            onToggleShow={() => setShowCurrent(v => !v)}
          />
          <View style={styles.divider} />
          <Field
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            showPassword={showNew}
            onToggleShow={() => setShowNew(v => !v)}
          />
          <View style={styles.divider} />
          <Field
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            showPassword={showConfirm}
            onToggleShow={() => setShowConfirm(v => !v)}
          />
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Password Tips</Text>
          {['At least 6 characters', 'Mix letters and numbers', 'Avoid using your name or email'].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={handleChange} disabled={loading} activeOpacity={0.85} style={{ marginTop: 8 }}>
          <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{loading ? 'Updating...' : 'Update Password'}</Text>
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
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  iconSection: { alignItems: 'center', marginBottom: 28 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  iconEmoji: { fontSize: 32 },
  iconSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  fieldGroup: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  input: { flex: 1, fontSize: 15, color: '#1F2937', paddingVertical: 8 },
  eyeBtn: { paddingLeft: 10, paddingVertical: 8 },
  eyeIcon: { fontSize: 16 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  tipsCard: { backgroundColor: '#EDE9FE', borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 16 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#4C1D95', marginBottom: 8 },
  tipRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  tipDot: { color: '#6D28D9', fontWeight: 'bold' },
  tipText: { fontSize: 13, color: '#5B21B6' },
  saveButton: { borderRadius: 16, padding: 18, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ChangePasswordScreen;