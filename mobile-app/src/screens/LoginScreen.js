import React, { useState, useEffect } from 'react';
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
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const REMEMBER_KEY = 'classback_remember_me';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();

  // Forgot password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Load remembered credentials on mount ──
  useEffect(() => {
    const loadRemembered = async () => {
      try {
        const saved = await AsyncStorage.getItem(REMEMBER_KEY);
        if (saved) {
          const { savedEmail, savedPassword } = JSON.parse(saved);
          setEmail(savedEmail || '');
          setPassword(savedPassword || '');
          setRememberMe(true);
        }
      } catch (_) {}
    };
    loadRemembered();
  }, []);

  // ── Password strength helpers ──
  const validatePassword = (pw) => ({
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasNumber: /\d/.test(pw),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
    isLong: pw.length >= 8,
  });
  const pwStrength = validatePassword(newPassword);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      // ✅ ADDED: specific alert for deactivated accounts
      if (result.message?.toLowerCase().includes('deactivat')) {
        Alert.alert(
          'Account Deactivated',
          'Your account has been deactivated. Please contact your administrator.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Login Failed', result.message);
      }
    } else {
      try {
        if (rememberMe) {
          await AsyncStorage.setItem(
            REMEMBER_KEY,
            JSON.stringify({ savedEmail: email, savedPassword: password })
          );
        } else {
          await AsyncStorage.removeItem(REMEMBER_KEY);
        }
      } catch (_) {}
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotEmail('');
    setForgotCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // ── Step 1: Send code to email ──
  const handleSendCode = async () => {
    if (!forgotEmail) { Alert.alert('Error', 'Please enter your email.'); return; }
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.toLowerCase().trim() });
      setForgotStep(2);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send reset code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Step 2: Verify code ──
  const handleVerifyCode = async () => {
    if (!forgotCode) { Alert.alert('Error', 'Please enter the verification code.'); return; }
    setForgotLoading(true);
    try {
      await api.post('/auth/verify-reset-code', {
        email: forgotEmail.toLowerCase().trim(),
        code: forgotCode.trim(),
      });
      setForgotStep(3);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Step 3: Reset password ──
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) { Alert.alert('Error', 'Please fill in all fields.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return; }
    if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return; }
    setForgotLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail.toLowerCase().trim(),
        code: forgotCode.trim(),
        newPassword,
      });
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'OK', onPress: closeForgotModal },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      {/* ── Forgot Password Modal ── */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={closeForgotModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>

            {/* Step progress bar */}
            <View style={styles.stepBar}>
              {[1, 2, 3].map(s => (
                <View key={s} style={[styles.stepSegment, forgotStep >= s && styles.stepSegmentActive]} />
              ))}
            </View>

            {/* Step 1 — Enter Email */}
            {forgotStep === 1 && (
              <>
                <Text style={styles.modalIcon}>🔐</Text>
                <Text style={styles.modalTitle}>Forgot Password?</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your email and we'll send a verification code to reset your password.
                </Text>
                <Text style={styles.modalLabel}>EMAIL ADDRESS</Text>
                <View style={styles.modalInputWrap}>
                  <Ionicons name="mail-outline" size={18} color="#666" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.modalInputWithIcon}
                    placeholder="Enter your email"
                    placeholderTextColor="#666"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity onPress={handleSendCode} disabled={forgotLoading} style={{ marginTop: 8 }}>
                  <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.modalBtn}>
                    {forgotLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.modalBtnText}>Send Code to Gmail →</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* Step 2 — Enter Code */}
            {forgotStep === 2 && (
              <>
                <Text style={styles.modalIcon}>📬</Text>
                <Text style={styles.modalTitle}>Check Your Gmail</Text>
                <Text style={styles.modalSubtitle}>We sent a verification code to:</Text>
                <Text style={styles.modalEmail}>{forgotEmail}</Text>
                <Text style={styles.modalLabel}>VERIFICATION CODE</Text>
                <TextInput
                  style={[styles.modalInput, styles.codeInput]}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#666"
                  value={forgotCode}
                  onChangeText={setForgotCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  onPress={() => { setForgotStep(1); setForgotCode(''); }}
                  style={{ alignItems: 'center', marginBottom: 10 }}
                >
                  <Text style={styles.resendText}>Didn't receive it? <Text style={styles.resendLink}>Resend code</Text></Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleVerifyCode} disabled={forgotLoading}>
                  <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.modalBtn}>
                    {forgotLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.modalBtnText}>Verify Code →</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* Step 3 — New Password */}
            {forgotStep === 3 && (
              <>
                <Text style={styles.modalIcon}>🔑</Text>
                <Text style={styles.modalTitle}>Set New Password</Text>
                <Text style={styles.modalSubtitle}>Create a new password for your account.</Text>
                <Text style={styles.modalLabel}>NEW PASSWORD</Text>
                <View style={styles.modalPasswordWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color="#666" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.modalPasswordInput}
                    placeholder="Enter new password"
                    placeholderTextColor="#666"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                {/* Password strength indicator */}
                {newPassword.length > 0 && (
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

                <Text style={[styles.modalLabel, { marginTop: 10 }]}>CONFIRM PASSWORD</Text>
                <View style={styles.modalPasswordWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color="#666" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.modalPasswordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="#666"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleResetPassword} disabled={forgotLoading} style={{ marginTop: 16 }}>
                  <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.modalBtn}>
                    {forgotLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.modalBtnText}>Reset Password →</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* Cancel */}
            <TouchableOpacity onPress={closeForgotModal} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            {/* Circular Logo Image */}
            <Image
              source={require('../../assets/last.png')}
              style={styles.logoImage}
            />
            <Text style={styles.title}>ClassBack</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.formContainer}>

            {/* ── Email field with mail icon ── */}
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#999" style={styles.fieldIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* ── Password field with lock icon + eye toggle ── */}
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#999" style={styles.fieldIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            {/* ── Remember Me + Forgot Password row ── */}
            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.rememberLeft}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleLogin} disabled={loading}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerText}>
                Don't have an account?{' '}
                <Text style={styles.registerTextBold}>Register</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollView: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#999' },
  formContainer: { width: '100%' },

  // ── Shared input wrap ──
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 24,
    paddingHorizontal: 14,
  },
  fieldIcon: {
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 16,
  },
  eyeBtn: {
    paddingLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Remember Me + Forgot row ──
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -4,
  },
  rememberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  rememberText: {
    color: '#ccc',
    fontSize: 13,
    marginLeft: 8,
  },
  forgotText: { color: '#a78bfa', fontSize: 13, fontWeight: '500' },

  loginButton: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  registerLink: { marginTop: 20, alignItems: 'center' },
  registerText: { color: '#999', fontSize: 14 },
  registerTextBold: { color: '#EC4899', fontWeight: 'bold' },

  // ── Modal styles ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 28, width: '100%', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  stepBar: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  stepSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  stepSegmentActive: { backgroundColor: '#8B5CF6' },
  modalIcon: { fontSize: 32, marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#999', marginBottom: 20, lineHeight: 20 },
  modalEmail: { fontSize: 14, fontWeight: '600', color: '#a78bfa', marginBottom: 20, marginTop: -14 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8 },

  // ── Modal email input wrap (Step 1) ──
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  modalInputWithIcon: {
    flex: 1,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },

  // kept for Step 2 code input
  modalInput: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  codeInput: { textAlign: 'center', fontSize: 22, letterSpacing: 8, fontWeight: 'bold' },

  // ── Modal password wrap (Step 3) ──
  modalPasswordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  modalPasswordInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },

  strengthWrap: {
    marginTop: -8,
    marginBottom: 12,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },
  strengthLabel: { color: '#ccc', fontSize: 11, marginBottom: 6 },
  strengthBars: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthHints: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  strengthHint: { fontSize: 11 },
  modalBtn: { borderRadius: 12, padding: 15, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  resendText: { fontSize: 12, color: '#666', marginBottom: 12 },
  resendLink: { color: '#a78bfa', fontWeight: '600' },
  cancelBtn: { marginTop: 14, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
});

export default LoginScreen;