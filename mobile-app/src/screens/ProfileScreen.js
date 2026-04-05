import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { logout, user } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  const MenuItem = ({ title, subtitle, showArrow = true, onPress }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && <Text style={styles.arrow}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>👤</Text>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <View style={styles.card}>
            <MenuItem title="Edit Profile" subtitle="Update your personal info" onPress={() => navigation.navigate('EditProfile')} />
            <MenuItem title="Email Address" subtitle={user?.email || "No email found"} showArrow={false} />
            <MenuItem title="Change Password" subtitle="Update your password" onPress={() => navigation.navigate('ChangePassword')} />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔔</Text>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.menuItem}>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Push Notifications</Text>
                <Text style={styles.menuSubtitle}>Receive feedback updates</Text>
              </View>
              <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ false: '#D1D5DB', true: '#EC4899' }} thumbColor="#fff" />
            </View>
          </View>
        </View>

        {/* Support & About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>ℹ️</Text>
            <Text style={styles.sectionTitle}>Support & About</Text>
          </View>
          <View style={styles.card}>
            <MenuItem title="Help Center" subtitle="Get help and support" onPress={() => navigation.navigate('HelpCenter')} />
            <MenuItem title="Terms & Conditions" subtitle="Read our terms" onPress={() => navigation.navigate('TermsAndConditions')} />
            <MenuItem title="About ClassBack" subtitle="Version 1.0.0" onPress={() => navigation.navigate('AboutClassBack')} />
            {/* The Team — static, not clickable */}
            <View style={styles.menuItem}>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>The Team</Text>
                <Text style={styles.menuSubtitle}>
                  Cristine Pogoy, Estefanie Castro, Deasyrie Sanico, Michael Vallecer, Rex Felecio
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButtonWrapper} onPress={handleLogout}>
          <View style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log Out</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 24, alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  backButton: { marginRight: 10 },
  backArrow: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 20, marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  menuSubtitle: { fontSize: 13, color: '#6B7280' },
  arrow: { fontSize: 24, color: '#D1D5DB' },
  logoutButtonWrapper: { marginBottom: 20 },
  logoutButton: { backgroundColor: '#ac2071', borderRadius: 16, padding: 18, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProfileScreen;