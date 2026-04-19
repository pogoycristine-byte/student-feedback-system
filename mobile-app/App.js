import { useState, useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import * as ExpoSplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import api from './src/services/api'; // ✅ FIXED: replaced raw axios with api instance

ExpoSplashScreen.preventAutoHideAsync();

// Show system banner even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Background/quit FCM handler (must be outside component)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background message:', remoteMessage);
});

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
import StudentSupportChatScreen from './src/screens/StudentSupportChatScreen';
import TermsAndConditionsScreen from './src/screens/TermsAndConditionsScreen';
import AboutClassBackScreen from './src/screens/AboutClassBackScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';

const Stack = createStackNavigator();

const Navigation = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const navigationRef = useNavigationContainerRef();

  // ✅ FCM Token — only runs when user is logged in
  useEffect(() => {
    const requestPermissionAndGetToken = async () => {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const token = await messaging().getToken();
        console.log('FCM Token:', token);
        await api.post('/users/save-fcm-token', { token }); // ✅ FIXED: correct base URL + auth header auto-attached
      }
    };

    if (user) requestPermissionAndGetToken();
  }, [user]);

  // ✅ FCM foreground — show system banner
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title ?? 'New Notification',
          body: remoteMessage.notification?.body ?? '',
        },
        trigger: null,
      });
    });
    return unsubscribe;
  }, []);

  // ✅ FCM background tap — navigate to Notifications
  useEffect(() => {
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      if (remoteMessage && navigationRef.isReady()) {
        navigationRef.navigate('Notifications');
      }
    });
    return unsubscribe;
  }, []);

  // ✅ FCM quit state tap — navigate to Notifications
  useEffect(() => {
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage && navigationRef.isReady()) {
        navigationRef.navigate('Notifications');
      }
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      setAuthReady(true);
    }
  }, [loading]);

  // Hide native splash
  useEffect(() => {
    ExpoSplashScreen.hideAsync();
  }, []);

  // Step 1: Animated SplashScreen with Lottie + countdown
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Step 2: Loading while auth resolves
  if (!authReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a0b2e' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  // Step 3: Main App
  return (
    <NavigationContainer ref={navigationRef}>
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
            <Stack.Screen name="StudentSupportChat" component={StudentSupportChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AboutClassBack" component={AboutClassBackScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MySupportMessages" component={StudentSupportChatScreen} options={{ headerShown: false }} />
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