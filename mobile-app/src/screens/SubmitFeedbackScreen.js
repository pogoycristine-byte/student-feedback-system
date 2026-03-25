import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { categoryAPI, feedbackAPI } from '../services/api';

const SubmitFeedbackScreen = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    teacherName: '',
    description: '',
    priority: 'Medium',
    location: 'TMC Main Campus',
    dateTime: '',
  });

  useEffect(() => {
    fetchCategories();
    const now = new Date();
    setSelectedDate(now);
    formatAndSetDateTime(now);
  }, []);

  const formatAndSetDateTime = (date) => {
    const formatted = date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setFormData((prev) => ({ ...prev, dateTime: formatted }));
  };

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      const cats = response.data.categories;

      const sorted = [...cats].sort((a, b) => {
        const aIsSuggestion = a.name?.toLowerCase().trim() === 'suggestions';
        const bIsSuggestion = b.name?.toLowerCase().trim() === 'suggestions';
        if (aIsSuggestion && !bIsSuggestion) return -1;
        if (!aIsSuggestion && bIsSuggestion) return 1;
        return 0;
      });

      setCategories(sorted);
      if (sorted.length > 0) {
        setFormData((prev) => ({ ...prev, category: sorted[0]._id }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) addMedia(result.assets[0]);
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library permission is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) addMedia(result.assets[0]);
  };

  const addMedia = (file) => {
    if (mediaFiles.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 files');
      return;
    }
    setMediaFiles((prev) => [...prev, file]);
  };

  const removeMedia = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const showMediaOptions = () => {
    Alert.alert('Add Photo or Video', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickMedia },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString();
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.subject || !formData.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (formData.description.length < 10) {
      Alert.alert('Error', 'Description must be at least 10 characters');
      return;
    }
    if (!formData.dateTime || formData.dateTime.trim() === '') {
      Alert.alert('Error', 'Please enter the date and time of class');
      return;
    }
    setSubmitting(true);
    try {
      const submissionData = {
        ...formData,
        isAnonymous: isAnonymous,
        submittedAt: getCurrentDateTime(),
      };

      if (mediaFiles.length > 0) {
        await feedbackAPI.submitWithMedia(submissionData, mediaFiles);
      } else {
        await feedbackAPI.submit(submissionData);
      }

      Alert.alert('Success', 'Feedback submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            const now = new Date();
            setSelectedDate(now);
            formatAndSetDateTime(now);
            setFormData({
              category: categories[0]?._id || '',
              subject: '',
              teacherName: '',
              description: '',
              priority: 'Medium',
              location: 'TMC Main Campus',
              dateTime: '',
            });
            setMediaFiles([]);
            setIsAnonymous(false);
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      };
      Alert.alert('🔴 Error Details', JSON.stringify(errorDetails, null, 2));
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (event, selectedDateValue) => {
    setShowDatePicker(false);
    if (selectedDateValue) {
      const newDate = new Date(selectedDateValue);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      setSelectedDate(newDate);
      formatAndSetDateTime(newDate);
    }
  };

  const onTimeChange = (event, selectedTimeValue) => {
    setShowTimePicker(false);
    if (selectedTimeValue) {
      const newTime = new Date(selectedDate);
      newTime.setHours(selectedTimeValue.getHours());
      newTime.setMinutes(selectedTimeValue.getMinutes());
      setSelectedDate(newTime);
      formatAndSetDateTime(newTime);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#6D28D9', '#BE185D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Submit Feedback</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6D28D9" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6D28D9', '#BE185D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Feedback</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>

          {/* Anonymous Toggle */}
          <View style={styles.anonymousCard}>
            <View style={styles.anonymousHeader}>
              <Text style={styles.anonymousIcon}>🕵️</Text>
              <View style={styles.anonymousTextContainer}>
                <Text style={styles.anonymousTitle}>Submit Anonymously</Text>
                <Text style={styles.anonymousSubtitle}>
                  {isAnonymous 
                    ? "Your identity will be hidden from staff" 
                    : "Staff will see your name and details"}
                </Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: '#ddd', true: '#8B5CF6' }}
                thumbColor={isAnonymous ? '#6D28D9' : '#f4f3f4'}
                ios_backgroundColor="#ddd"
              />
            </View>
            {isAnonymous && (
              <View style={styles.anonymousInfo}>
                <Text style={styles.anonymousInfoIcon}>ℹ️</Text>
                <Text style={styles.anonymousInfoText}>
                  Only administrators can see your identity. Staff members will see this as "Anonymous Student".
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.label}>Category (Required)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {categories.map((cat) => (
                <Picker.Item key={cat._id} label={`${cat.icon} ${cat.name}`} value={cat._id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Location (Required)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.location}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="TMC Main Campus" value="TMC Main Campus" />
              <Picker.Item label="TMC Expansion" value="TMC Expansion" />
              <Picker.Item label="TMC Extension" value="TMC Extension" />
            </Picker>
          </View>

          {/* Date & Time with Icons Inside Input - White background */}
          <Text style={styles.label}>Date & Time of Class (Required)</Text>
          <View style={styles.inputWithIcons}>
            <TextInput
              style={styles.inputWithIconsField}
              placeholder="Select date and time"
              placeholderTextColor="#999"
              value={formData.dateTime}
              editable={false}
            />
            <TouchableOpacity style={styles.iconInside} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.iconInsideText}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconInside} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.iconInsideText}>⏰</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Select date and time when the class occurred</Text>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date(2000, 0, 1)}
              maximumDate={new Date(2030, 11, 31)}
            />
          )}

          {/* Time Picker */}
          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          <Text style={styles.label}>Subject/Class (Required)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Mathematics 101"
            placeholderTextColor="#999"
            value={formData.subject}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, subject: text }))}
          />

          <Text style={styles.label}>Teacher Name (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter teacher name"
            placeholderTextColor="#999"
            value={formData.teacherName}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, teacherName: text }))}
          />

          <Text style={styles.label}>Description (Required, min 10 characters)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your feedback in detail..."
            placeholderTextColor="#999"
            value={formData.description}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Photos/Videos ({mediaFiles.length}/5)</Text>

          {mediaFiles.length > 0 && (
            <View style={styles.mediaGrid}>
              {mediaFiles.map((file, index) => (
                <View key={index} style={styles.mediaItem}>
                  <Image
                    source={{ uri: file.uri }}
                    style={styles.mediaPreview}
                  />
                  {(file.type === 'video' || file.mimeType?.startsWith('video/')) && (
                    <View style={styles.videoOverlay}>
                      <Text style={styles.videoIcon}>🎥</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeMedia(index)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {mediaFiles.length < 5 && (
            <TouchableOpacity style={styles.uploadButton} onPress={showMediaOptions}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>Add Photo or Video</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
            <LinearGradient colors={['#6D28D9', '#BE185D']} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>
                {submitting ? 'Uploading...' : 'Submit Feedback'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  backArrow: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  form: { width: '100%' },
  
  // Anonymous Styles
  anonymousCard: {
    backgroundColor: '#f8f4ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e9d5ff',
  },
  anonymousHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  anonymousIcon: {
    fontSize: 28,
  },
  anonymousTextContainer: {
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 2,
  },
  anonymousSubtitle: {
    fontSize: 12,
    color: '#8B5CF6',
  },
  anonymousInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9d5ff',
  },
  anonymousInfoIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  anonymousInfoText: {
    flex: 1,
    fontSize: 11,
    color: '#6D28D9',
    lineHeight: 16,
  },
  
  // Input with Icons Inside - White background
  inputWithIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  inputWithIconsField: {
    flex: 1,
    padding: 12,
    color: '#1a1a2e',
    fontSize: 15,
    backgroundColor: '#fff',
  },
  iconInside: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  iconInsideText: {
    fontSize: 18,
  },
  
  label: { fontSize: 13, color: '#1a1a2e', marginBottom: 6, fontWeight: '600' },
  helperText: { 
    fontSize: 11, 
    color: '#666', 
    marginTop: -8, 
    marginBottom: 12, 
    fontStyle: 'italic' 
  },
  input: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 12, 
    color: '#1a1a2e', 
    fontSize: 15, 
    borderWidth: 1, 
    borderColor: '#e0e0e0' 
  },
  textArea: { height: 100 },
  pickerContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#e0e0e0',
    overflow: 'hidden'
  },
  picker: { 
    color: '#1a1a2e', 
    height: 50 
  },
  pickerItem: {
    fontSize: 15,
    color: '#1a1a2e',
    borderRadius: 8,
  },
  uploadButton: { 
    backgroundColor: '#f8f4ff', 
    borderRadius: 12, 
    padding: 18, 
    alignItems: 'center', 
    marginBottom: 12, 
    borderWidth: 2, 
    borderColor: '#e9d5ff', 
    borderStyle: 'dashed' 
  },
  uploadIcon: { fontSize: 32, marginBottom: 6 },
  uploadText: { fontSize: 13, color: '#6D28D9', fontWeight: '600' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 8 },
  mediaItem: { width: '48%', position: 'relative', marginBottom: 8 },
  mediaPreview: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#000' },
  videoOverlay: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: 4 },
  videoIcon: { fontSize: 16 },
  removeButton: { position: 'absolute', top: 4, right: 4, backgroundColor: '#EF4444', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  removeButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  submitButton: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, elevation: 6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { padding: 14, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: '#999', fontSize: 15 },
});

export default SubmitFeedbackScreen;