import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'https://student-feedback-backend-1xw4.onrender.com/api';

const CARTOON_AVATARS = [
  { id: 'felix', uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=felix&backgroundColor=b6e3f4' },
  { id: 'mia',   uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=mia&backgroundColor=ffdfbf' },
  { id: 'leo',   uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=leo&backgroundColor=c0aede' },
  { id: 'zara',  uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=zara&backgroundColor=d1f4d1' },
  { id: 'max',   uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=max&backgroundColor=ffd5dc' },
  { id: 'luna',  uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=luna&backgroundColor=ffeaa7' },
];

// ✅ NEW: Generate a DiceBear avatar URL from the user's name as fallback
const generateAutoAvatar = (name) => {
  const seed = encodeURIComponent(name.trim().toLowerCase().replace(/\s+/g, '-') || 'student');
  const colors = ['b6e3f4', 'ffdfbf', 'c0aede', 'd1f4d1', 'ffd5dc', 'ffeaa7', 'e8d5ff', 'ffd6a5'];
  const color = colors[seed.length % colors.length];
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=${color}`;
};

const Field = React.memo(({
  field, placeholder, keyboardType, secureTextEntry, autoCapitalize,
  formData, errors, handleChange,
}) => (
  <View style={styles.fieldWrap}>
    <TextInput
      style={[styles.input, errors[field] && styles.inputError]}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={formData[field]}
      onChangeText={(text) => handleChange(field, text)}
      keyboardType={keyboardType || 'default'}
      secureTextEntry={secureTextEntry || false}
      autoCapitalize={autoCapitalize || 'sentences'}
    />
    {errors[field] && <Text style={styles.errorText}>⚠ {errors[field]}</Text>}
  </View>
));

const RegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState('form');

  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    email: '',
    phoneNumber: '',
    yearLevel: '1st Year',
    section: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors]                           = useState({});
  const [loading, setLoading]                         = useState(false);
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImage, setProfileImage]               = useState(null);
  const [selectedCartoon, setSelectedCartoon]         = useState(null);

  const { setUser } = useAuth();
  const scrollRef   = useRef(null);

  const handleStudentIdChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 9);
    const formatted = digits.length > 2 ? digits.slice(0, 2) + '-' + digits.slice(2) : digits;
    setFormData(prev => ({ ...prev, studentId: formatted }));
    if (errors.studentId) setErrors(prev => ({ ...prev, studentId: null }));
  };

  const validateEmail    = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePhone    = (p) => /^\d{11}$/.test(p);

  const validatePassword = (password) => ({
    hasUpper:   /[A-Z]/.test(password),
    hasLower:   /[a-z]/.test(password),
    hasNumber:  /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    isLong:     password.length >= 8,
  });

  const isPasswordStrong = (pw) => {
    const r = validatePassword(pw);
    return r.hasUpper && r.hasLower && r.hasNumber && r.hasSpecial && r.isLong;
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim())        newErrors.name = 'Full name is required';
    if (!formData.studentId.trim())   newErrors.studentId = 'Student ID is required';
    if (!formData.email.trim())       newErrors.email = 'Email is required';
    else if (!validateEmail(formData.email)) newErrors.email = 'Enter a valid email address';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    else if (!validatePhone(formData.phoneNumber)) newErrors.phoneNumber = 'Phone number must be exactly 11 digits';
    if (!formData.section.trim())     newErrors.section = 'Block is required';
    if (!formData.password)           newErrors.password = 'Password is required';
    else if (!isPasswordStrong(formData.password))
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    if (!formData.confirmPassword)    newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleNext = () => {
    Keyboard.dismiss();
    if (!validate()) return;
    setStep('avatar');
  };

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
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImage({ uri: result.assets[0].uri });
      setSelectedCartoon(null);
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
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImage({ uri: result.assets[0].uri });
      setSelectedCartoon(null);
    }
  };

  const handleRegister = async (avatarChoice) => {
    setLoading(true);
    try {
      const isLocalPhoto = avatarChoice?.uri && !avatarChoice.uri.startsWith('http');

      let response;

      if (isLocalPhoto) {
        const form = new FormData();
        form.append('name',        formData.name);
        form.append('studentId',   formData.studentId);
        form.append('email',       formData.email);
        form.append('phoneNumber', formData.phoneNumber);
        form.append('yearLevel',   formData.yearLevel);
        form.append('section',     formData.section);
        form.append('password',    formData.password);
        form.append('profilePicture', {
          uri:  avatarChoice.uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });

        response = await axios.post(`${API_URL}/auth/register`, form, {
          timeout: 30000,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await axios.post(`${API_URL}/auth/register`, {
          name:           formData.name,
          studentId:      formData.studentId,
          email:          formData.email,
          phoneNumber:    formData.phoneNumber,
          yearLevel:      formData.yearLevel,
          section:        formData.section,
          password:       formData.password,
          profilePicture: avatarChoice?.uri ?? null,
        }, {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { token, user } = response.data;

      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      setUser(user);

      setLoading(false);
      Alert.alert('Success', 'Registration successful!', [
        { text: 'OK', onPress: () => navigation.replace('Home') },
      ]);
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Registration failed';
      Alert.alert('Registration Failed', message);
    }
  };

  const handleConfirmAvatar = () => {
    if (profileImage) {
      handleRegister(profileImage);
    } else if (selectedCartoon) {
      const cartoon = CARTOON_AVATARS.find(a => a.id === selectedCartoon);
      handleRegister({ uri: cartoon?.uri });
    } else {
      handleRegister(null);
    }
  };

  // ✅ NEW: Skip now uses the user's name to generate an auto avatar instead of null
  const handleSkip = () => {
    const autoAvatarUri = generateAutoAvatar(formData.name);
    handleRegister({ uri: autoAvatarUri });
  };

  const pwStrength = validatePassword(formData.password);

  // ── STEP 1 — Form ──────────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          style={styles.keyboardView}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
            </View>

            <View style={styles.formContainer}>
              <Field field="name" placeholder="Full Name" formData={formData} errors={errors} handleChange={handleChange} />

              <View style={styles.fieldWrap}>
                <TextInput
                  style={[styles.input, errors.studentId && styles.inputError]}
                  placeholder="Student ID (e.g. 23-12345)"
                  placeholderTextColor="#999"
                  value={formData.studentId}
                  onChangeText={handleStudentIdChange}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  maxLength={11}
                />
                {errors.studentId && <Text style={styles.errorText}>⚠ {errors.studentId}</Text>}
              </View>

              <Field field="email" placeholder="Email" keyboardType="email-address" autoCapitalize="none" formData={formData} errors={errors} handleChange={handleChange} />

              <View style={styles.fieldWrap}>
                <TextInput
                  style={[styles.input, errors.phoneNumber && styles.inputError]}
                  placeholder="Phone Number (11 digits)"
                  placeholderTextColor="#999"
                  value={formData.phoneNumber}
                  onChangeText={(text) => handleChange('phoneNumber', text.replace(/\D/g, '').slice(0, 11))}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
                {errors.phoneNumber && <Text style={styles.errorText}>⚠ {errors.phoneNumber}</Text>}
              </View>

              <View style={[styles.pickerContainer, errors.yearLevel && styles.inputError]}>
                <Picker
                  selectedValue={formData.yearLevel}
                  onValueChange={(value) => handleChange('yearLevel', value)}
                  style={styles.picker}
                  dropdownIconColor="#fff"
                >
                  <Picker.Item label="1st Year" value="1st Year" />
                  <Picker.Item label="2nd Year" value="2nd Year" />
                  <Picker.Item label="3rd Year" value="3rd Year" />
                  <Picker.Item label="4th Year" value="4th Year" />
                </Picker>
              </View>

              <Field field="section" placeholder="Block" formData={formData} errors={errors} handleChange={handleChange} />

              {/* PASSWORD */}
              <View style={styles.fieldWrap}>
                <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
                  <TextInput
                    style={styles.inputPassword}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={formData.password}
                    onChangeText={(text) => handleChange('password', text)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>⚠ {errors.password}</Text>}
                {formData.password.length > 0 && (
                  <View style={styles.strengthWrap}>
                    <Text style={styles.strengthLabel}>Password strength:</Text>
                    <View style={styles.strengthBars}>
                      {[pwStrength.isLong, pwStrength.hasUpper, pwStrength.hasLower, pwStrength.hasNumber, pwStrength.hasSpecial].map((met, i) => (
                        <View key={i} style={[styles.strengthBar, { backgroundColor: met ? '#22c55e' : 'rgba(255,255,255,0.15)' }]} />
                      ))}
                    </View>
                    <View style={styles.strengthHints}>
                      {[
                        { label: '8+ chars', met: pwStrength.isLong },
                        { label: 'Uppercase', met: pwStrength.hasUpper },
                        { label: 'Lowercase', met: pwStrength.hasLower },
                        { label: 'Number', met: pwStrength.hasNumber },
                        { label: 'Symbol', met: pwStrength.hasSpecial },
                      ].map((h, i) => (
                        <Text key={i} style={[styles.strengthHint, { color: h.met ? '#22c55e' : '#999' }]}>
                          {h.met ? '✓' : '✗'} {h.label}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* CONFIRM PASSWORD */}
              <View style={styles.fieldWrap}>
                <View style={[styles.passwordWrap, errors.confirmPassword && styles.inputError]}>
                  <TextInput
                    style={styles.inputPassword}
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleChange('confirmPassword', text)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && <Text style={styles.errorText}>⚠ {errors.confirmPassword}</Text>}
              </View>

              <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  style={styles.registerButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.registerButtonText}>Next →</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
                <Text style={styles.loginText}>
                  Already have an account? <Text style={styles.loginTextBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  // ── STEP 2 — Profile picture ───────────────────────────────────────────────
  const previewUri = profileImage?.uri
    ?? (selectedCartoon ? CARTOON_AVATARS.find(a => a.id === selectedCartoon)?.uri : null);

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollView, { paddingTop: 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile Picture</Text>
        </View>

        {/* ✅ NEW: Show auto avatar preview when nothing is selected */}
        <View style={styles.avatarPreviewWrap}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.avatarPreview} />
          ) : (
            <View style={styles.autoAvatarWrap}>
              <Image
                source={{ uri: generateAutoAvatar(formData.name) }}
                style={styles.avatarPreview}
              />
              <View style={styles.autoAvatarBadge}>
                <Text style={styles.autoAvatarBadgeText}>Auto</Text>
              </View>
            </View>
          )}
          {previewUri && (
            <TouchableOpacity
              style={styles.clearAvatarBtn}
              onPress={() => { setProfileImage(null); setSelectedCartoon(null); }}
            >
              <Ionicons name="close-circle" size={26} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* ✅ NEW: Hint text when on auto avatar */}
        {!previewUri && (
          <Text style={styles.autoAvatarHint}>
            ✨ An avatar was generated from your name. You can change it or keep it!
          </Text>
        )}

        <View style={styles.photoSourceRow}>
          <TouchableOpacity style={styles.photoSourceBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={20} color="#fff" />
            <Text style={styles.photoSourceText}>Camera</Text>
          </TouchableOpacity>
          <View style={styles.photoSourceDivider} />
          <TouchableOpacity style={styles.photoSourceBtn} onPress={handlePickImage} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={20} color="#fff" />
            <Text style={styles.photoSourceText}>Gallery</Text>
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
              onPress={() => {
                setSelectedCartoon(avatar.id);
                setProfileImage(null);
              }}
              style={[
                styles.cartoonItem,
                selectedCartoon === avatar.id && styles.cartoonItemSelected,
              ]}
              activeOpacity={0.8}
            >
              <Image source={{ uri: avatar.uri }} style={styles.cartoonImage} />
              {selectedCartoon === avatar.id && (
                <View style={styles.cartoonCheck}>
                  <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.avatarActionsWrap}>
          <TouchableOpacity
            onPress={handleConfirmAvatar}
            disabled={loading || (!profileImage && !selectedCartoon)}
            activeOpacity={0.8}
            style={{ opacity: (!profileImage && !selectedCartoon) ? 0.4 : 1 }}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              style={styles.registerButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Creating Account...' : 'Use This Picture'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ✅ UPDATED: Skip now says "Use Auto Avatar" and shows what will be used */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleSkip}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>Use Auto Avatar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.goBackBtn}
            onPress={() => setStep('form')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-outline" size={16} color="#aaa" style={{ marginRight: 4 }} />
            <Text style={styles.goBackBtnText}>Go back & change details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1 },
  keyboardView: { flex: 1 },
  scrollView: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  header:       { marginBottom: 14 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  formContainer: { width: '100%' },
  fieldWrap:     { marginBottom: 12 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  pickerContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  picker: { color: '#fff', height: 50 },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputPassword: {
    flex: 1,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthWrap: {
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },
  strengthLabel: { color: '#ccc', fontSize: 11, marginBottom: 6 },
  strengthBars:  { flexDirection: 'row', gap: 4, marginBottom: 8 },
  strengthBar:   { flex: 1, height: 4, borderRadius: 2 },
  strengthHints: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  strengthHint:  { fontSize: 11 },
  registerButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loginLink:          { marginTop: 20, alignItems: 'center', marginBottom: 10 },
  loginText:          { color: '#999', fontSize: 14 },
  loginTextBold:      { color: '#EC4899', fontWeight: 'bold' },
  avatarPreviewWrap: {
    alignSelf: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarPreview: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  avatarPreviewPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ✅ NEW styles for auto avatar
  autoAvatarWrap: {
    position: 'relative',
  },
  autoAvatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
  },
  autoAvatarBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  autoAvatarHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: -4,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  clearAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1a1a2e',
    borderRadius: 13,
  },
  photoSourceRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.5)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  photoSourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  photoSourceDivider: {
    width: 1,
    backgroundColor: 'rgba(139,92,246,0.5)',
  },
  photoSourceText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginHorizontal: 10 },
  cartoonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  cartoonItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  cartoonItemSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  cartoonImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cartoonCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  avatarActionsWrap: { gap: 10 },
  skipBtn: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    marginTop: 2,
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  skipBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },
  goBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  goBackBtnText: { color: '#aaa', fontSize: 13 },
});

export default RegisterScreen;