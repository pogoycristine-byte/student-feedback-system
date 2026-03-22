import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Prevent the native Expo splash from hiding automatically
// It will be hidden immediately when our custom splash mounts
ExpoSplashScreen.preventAutoHideAsync();

// Import Screens
import SplashScreen from './src/screens/SplashScreen';
import FeedbackDetailScreen from './src/screens/FeedbackDetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import MyFeedbackScreen from './src/screens/MyFeedbackScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SubmitFeedbackScreen from './src/screens/SubmitFeedbackScreen';
import ChatScreen from './src/screens/ChatScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import HelpCenterScreen from './src/screens/HelpCenterScreen';
import ContactSupportScreen from './src/screens/ContactSupportScreen';
import TermsAndConditionsScreen from './src/screens/TermsAndConditionsScreen';
import AboutClassBackScreen from './src/screens/AboutClassBackScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';

const Stack = createStackNavigator();

const Navigation = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // Wait for auth to be ready
  useEffect(() => {
    if (!loading) {
      setAuthReady(true);
    }
  }, [loading]);

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Show loading after splash while auth loads
  if (!authReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a0b2e' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#8B5CF6',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SubmitFeedback" component={SubmitFeedbackScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MyFeedback" component={MyFeedbackScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FeedbackDetail" component={FeedbackDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
            <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ContactSupport" component={ContactSupportScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AboutClassBack" component={AboutClassBackScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar translucent={false} backgroundColor="#6D28D9" barStyle="light-content" />
      <Navigation />
    </AuthProvider>
  );
}