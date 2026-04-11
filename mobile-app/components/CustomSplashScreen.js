import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

const CustomSplashScreen = () => {
  return (
    <LinearGradient
      colors={['#1a1a2e', '#3b1a6e', '#6b1f6e', '#7b1f5e', '#4a1a5e', '#1a1a2e']}
      locations={[0, 0.25, 0.5, 0.7, 0.85, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      {/* Top section - FordaGors + ClassBack */}
      <View style={styles.topSection}>
        <Text style={styles.fordaGors}>Forda Gors</Text>
        <Text style={styles.classBack}>ClassBack</Text>
      </View>

      {/* Bottom - version */}
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
  topSection: {
    marginTop: height * 0.22,
    paddingHorizontal: 32,
  },
  fordaGors: {
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#ffffff',
    marginBottom: 6,
  },
  classBack: {
    fontSize: 16,
    color: '#e879f9',
    fontWeight: '400',
  },
  version: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    fontSize: 13,
    color: '#c084fc',
  },
});

export default CustomSplashScreen;