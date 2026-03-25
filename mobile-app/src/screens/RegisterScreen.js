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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const Field = React.memo(({
  field,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  formData,
  errors,
  handleChange,
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

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuth();
  const scrollRef = useRef(null);

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePhone = (phone) =>
    /^\d{11}$/.test(phone);

  const validatePassword = (password) => {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLong = password.length >= 8;
    return { hasUpper, hasLower, hasNumber, hasSpecial, isLong };
  };

  const isPasswordStrong = (password) => {
    const r = validatePassword(password);
    return r.hasUpper && r.hasLower && r.hasNumber && r.hasSpecial && r.isLong;
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.studentId.trim()) newErrors.studentId = 'Student ID is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhone(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must be exactly 11 digits';
    }

    if (!formData.section.trim()) newErrors.section = 'Block is required';

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isPasswordStrong(formData.password)) {
      newErrors.password =
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleRegister = async () => {
    Keyboard.dismiss(); // Dismiss keyboard first
    if (!validate()) return;

    setLoading(true);

    const result = await register({
      name: formData.name,
      studentId: formData.studentId,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      yearLevel: formData.yearLevel,
      section: formData.section,
      password: formData.password,
    });

    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Registration successful!', [
        { text: 'OK', onPress: () => navigation.replace('Home') },
      ]);
    } else {
      Alert.alert('Registration Failed', result.message);
    }
  };

  const pwStrength = validatePassword(formData.password);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
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

            <Field field="studentId" placeholder="Student ID" autoCapitalize="none" formData={formData} errors={errors} handleChange={handleChange} />

            <Field field="email" placeholder="Email" keyboardType="email-address" autoCapitalize="none" formData={formData} errors={errors} handleChange={handleChange} />

            <Field field="phoneNumber" placeholder="Phone Number (11 digits)" keyboardType="phone-pad" autoCapitalize="none" formData={formData} errors={errors} handleChange={handleChange} />

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
                />

                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#999"
                  />
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
                />

                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>

              {errors.confirmPassword && <Text style={styles.errorText}>⚠ {errors.confirmPassword}</Text>}
            </View>

            {/* Fixed Button - No glitching */}
            <TouchableOpacity 
              onPress={handleRegister} 
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={['#8B5CF6', '#EC4899']} 
                style={styles.registerButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.registerButtonText}>
                  {loading ? 'Creating Account...' : 'Register'}
                </Text>
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
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollView: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },

  header: { marginBottom: 20 },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },

  formContainer: { width: '100%' },

  fieldWrap: { marginBottom: 12 },

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

  strengthWrap: {
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },

  strengthLabel: {
    color: '#ccc',
    fontSize: 11,
    marginBottom: 6,
  },

  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },

  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },

  strengthHints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  strengthHint: {
    fontSize: 11,
  },

  registerButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },

  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  loginLink: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 10,
  },

  loginText: {
    color: '#999',
    fontSize: 14,
  },

  loginTextBold: {
    color: '#EC4899',
    fontWeight: 'bold',
  },

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
});

export default RegisterScreen;