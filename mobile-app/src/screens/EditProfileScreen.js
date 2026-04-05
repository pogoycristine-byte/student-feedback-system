import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, Image,
  KeyboardAvoidingView, Platform, Keyboard,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const CARTOON_AVATARS = [
  { id: 'felix',   uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=felix&backgroundColor=b6e3f4' },
  { id: 'mia',     uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=mia&backgroundColor=ffdfbf' },
  { id: 'leo',     uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=leo&backgroundColor=c0aede' },
  { id: 'zara',    uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=zara&backgroundColor=d1f4d1' },
  { id: 'max',     uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=max&backgroundColor=ffd5dc' },
  { id: 'luna',    uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=luna&backgroundColor=ffeaa7' },
];

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profilePicture ? { uri: user.profilePicture } : null);
  const [selectedCartoon, setSelectedCartoon] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const scrollRef = useRef(null);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImage({ uri: result.assets[0].uri });
      setSelectedCartoon(null);
      setShowAvatarPicker(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImage({ uri: result.assets[0].uri });
      setSelectedCartoon(null);
      setShowAvatarPicker(false);
    }
  };

  const handleSelectCartoon = (avatar) => {
    setSelectedCartoon(avatar.id);
    setProfileImage(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      let response;
      let newProfilePictureUrl = null;

      const isLocalPhoto = profileImage?.uri && !profileImage.uri.startsWith('http');

      if (isLocalPhoto) {
        // Upload local photo as form data
        const form = new FormData();
        form.append('name', name.trim());
        form.append('phoneNumber', phone.trim());
        form.append('profilePicture', {
          uri: profileImage.uri,
          type: 'image/jpeg',
          name: `profile_${Date.now()}.jpg`,
        });
        response = await authAPI.updateProfileForm(form);
        
        // Log the FULL response to see what we're getting
        console.log('========== FULL SERVER RESPONSE ==========');
        console.log('Status:', response.status);
        console.log('Headers:', response.headers);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        console.log('==========================================');
        
        // Try different paths to get the profile picture
        newProfilePictureUrl = response.data?.user?.profilePicture || 
                              response.data?.profilePicture || 
                              response.data?.data?.profilePicture ||
                              null;
        
        console.log('Extracted photo URL:', newProfilePictureUrl);
      } else {
        // Update with cartoon URL or no image change
        const payload = { name: name.trim(), phoneNumber: phone.trim() };
        if (selectedCartoon) {
          const cartoon = CARTOON_AVATARS.find(a => a.id === selectedCartoon);
          payload.profilePicture = cartoon?.uri;
          newProfilePictureUrl = cartoon?.uri;
        }
        response = await authAPI.updateProfile(payload);
        
        console.log('========== FULL SERVER RESPONSE (Cartoon) ==========');
        console.log('Data:', JSON.stringify(response.data, null, 2));
        console.log('=====================================================');
        
        newProfilePictureUrl = response.data?.user?.profilePicture || 
                              response.data?.profilePicture || 
                              newProfilePictureUrl;
      }

      // Get the updated user from response
      const updatedUserFromServer = response.data?.user || response.data;
      
      console.log('Updated user from server:', JSON.stringify(updatedUserFromServer, null, 2));
      console.log('New profile picture URL to save:', newProfilePictureUrl);
      
      // Determine the final profile picture URL
      const finalProfilePicture = newProfilePictureUrl || updatedUserFromServer?.profilePicture || user?.profilePicture;
      
      console.log('Final profile picture being saved:', finalProfilePicture);
      
      // Create updated user object
      const updatedUserData = {
        ...user,
        name: updatedUserFromServer?.name || name.trim(),
        phoneNumber: updatedUserFromServer?.phoneNumber || phone.trim(),
        profilePicture: finalProfilePicture,
      };
      
      console.log('Updated user data object:', JSON.stringify(updatedUserData, null, 2));
      
      // Update using context
      await updateUser(updatedUserData);
      
      // Also directly update SecureStore
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUserData));
      
      // Verify what was saved
      const verifySaved = await SecureStore.getItemAsync('user');
      console.log('Verified saved user:', verifySaved);
      
      // Force a context update
      if (setUser) {
        await setUser(updatedUserData);
      }

      setLoading(false);
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      setLoading(false);
      console.error('Update error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile. Please try again.');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setName(user?.name || '');
    setPhone(user?.phoneNumber || '');
    setStudentId(user?.studentId || '');
    setProfileImage(user?.profilePicture ? { uri: user.profilePicture } : null);
    setSelectedCartoon(null);
    setRefreshing(false);
  }, [user]);

  const previewUri = profileImage?.uri ?? (selectedCartoon ? CARTOON_AVATARS.find(a => a.id === selectedCartoon)?.uri : user?.profilePicture);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#6D28D9', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{loading ? '...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6D28D9"
            colors={['#6D28D9', '#BE185D']}
          />
        }
      >
        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setShowAvatarPicker(!showAvatarPicker)}
            activeOpacity={0.8}
          >
            {previewUri ? (
              <Image 
                key={previewUri}
                source={{ uri: previewUri }} 
                style={styles.avatarImage} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View style={styles.editIconContainer}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>

        {/* Avatar Picker (Collapsible) */}
        {showAvatarPicker && (
          <View style={styles.avatarPickerCard}>
            <View style={styles.photoSourceRow}>
              <TouchableOpacity style={styles.photoSourceBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={20} color="#6D28D9" />
                <Text style={styles.uploadBtnText}>Camera</Text>
              </TouchableOpacity>
              <View style={styles.photoSourceDivider} />
              <TouchableOpacity style={styles.photoSourceBtn} onPress={handlePickImage} activeOpacity={0.8}>
                <Ionicons name="image-outline" size={20} color="#6D28D9" />
                <Text style={styles.uploadBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or choose an avatar</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.cartoonGrid}>
              {CARTOON_AVATARS.map((avatar) => (
                <TouchableOpacity
                  key={avatar.id}
                  onPress={() => handleSelectCartoon(avatar)}
                  style={[
                    styles.cartoonItem,
                    selectedCartoon === avatar.id && styles.cartoonItemSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: avatar.uri }} style={styles.cartoonImage} />
                  {selectedCartoon === avatar.id && (
                    <View style={styles.cartoonCheck}>
                      <Ionicons name="checkmark-circle" size={20} color="#6D28D9" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {(profileImage || selectedCartoon) && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => { setProfileImage(null); setSelectedCartoon(null); }}
              >
                <Text style={styles.clearBtnText}>Clear Selection</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.divider} />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email || ''}
              editable={false}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.divider} />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Student ID</Text>
            <TextInput
              style={styles.input}
              value={studentId}
              onChangeText={setStudentId}
              placeholder="Enter your student ID"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.divider} />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { width: 40 },
  backArrow: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#6D28D9',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#6D28D9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#BE185D',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#6D28D9',
    borderRadius: 18,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  profileName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  avatarPickerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  photoSourceRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F3E8FF',
  },
  photoSourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  photoSourceDivider: {
    width: 1,
    backgroundColor: '#E9D5FF',
  },
  uploadBtnText: { color: '#6D28D9', fontSize: 14, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', fontSize: 11, marginHorizontal: 10 },
  cartoonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  cartoonItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  cartoonItemSelected: {
    borderColor: '#6D28D9',
    backgroundColor: '#F3E8FF',
  },
  cartoonImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cartoonCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  clearBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldGroup: { padding: 16 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  inputDisabled: { color: '#9CA3AF', backgroundColor: 'transparent' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
});

export default EditProfileScreen;