import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

const CustomSplashScreen = ({ onFinish }) => {

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#0a0a14', '#1a0a2e', '#2a0a3e', '#3a0a2e', '#1a0a2e', '#0a0a14']}
      locations={[0, 0.25, 0.5, 0.7, 0.85, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      <View style={styles.centerSection}>
        <Text style={styles.classBack}>ClassBack</Text>
        <Text style={styles.subtitle}>Classroom Feedback and Suggestions System</Text>
      </View>
      <Text style={styles.version}>version 1.0.0</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -60, // Moves everything higher
  },
  classBack: {
    fontSize: 52, // Bigger text
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 0, // No gap
  },
  subtitle: {
    fontSize: 14, // Smaller text
    color: '#8868c4',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  version: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    fontSize: 13,
    color: '#8868c4',
    textAlign: 'center',
  },
});

export default CustomSplashScreen;