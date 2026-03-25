import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';

ExpoSplashScreen.hideAsync();

const { width, height } = Dimensions.get('window');

const CURSIVE_FONT = Platform.select({
  ios: 'Snell Roundhand',
  android: 'cursive',
  default: 'cursive',
});

const SplashScreen = ({ onFinish }) => {
  const [countdown, setCountdown] = useState(5);

  const scaleAnim       = useRef(new Animated.Value(0.8)).current;
  const gradientX       = useRef(new Animated.Value(0)).current;
  const gradientY       = useRef(new Animated.Value(0)).current;
  const gradientRotate  = useRef(new Animated.Value(0)).current;
  const dotsAnim        = useRef(new Animated.Value(0)).current;
  const contentFadeIn   = useRef(new Animated.Value(0)).current;
  const iconFloat       = useRef(new Animated.Value(0)).current;
  const iconScale       = useRef(new Animated.Value(0)).current;
  const iconRotate      = useRef(new Animated.Value(0)).current;
  const iconGlow        = useRef(new Animated.Value(0)).current;
  const ring1Scale      = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity    = useRef(new Animated.Value(0.8)).current;
  const ring2Scale      = useRef(new Animated.Value(0.8)).current;
  const ring2Opacity    = useRef(new Animated.Value(0.6)).current;
  const sparkle1Opacity = useRef(new Animated.Value(0)).current;
  const sparkle2Opacity = useRef(new Animated.Value(0)).current;
  const sparkle3Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFadeIn, {
        toValue: 1, duration: 1500,
        useNativeDriver: true, easing: Easing.out(Easing.ease),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 4, tension: 80, useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(gradientX, { toValue: -width * 2, duration: 15000, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(gradientX, { toValue: 0, duration: 15000, easing: Easing.linear, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(gradientY, { toValue: -height * 2, duration: 12000, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(gradientY, { toValue: 0, duration: 12000, easing: Easing.linear, useNativeDriver: true }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(gradientRotate, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true }),
            Animated.timing(gradientRotate, { toValue: 0, duration: 18000, easing: Easing.linear, useNativeDriver: true }),
          ])
        ),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(dotsAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.spring(iconScale, {
      toValue: 1, friction: 5, tension: 60,
      useNativeDriver: true, delay: 400,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, { toValue: -14, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(iconFloat, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(iconRotate, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: -1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(iconGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(iconGlow, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    const pulseRing = (scaleRef, opacityRef, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scaleRef, { toValue: 1.8, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(opacityRef, { toValue: 0, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleRef, { toValue: 0.8, duration: 0, useNativeDriver: true }),
            Animated.timing(opacityRef, { toValue: 0.7, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    };
    pulseRing(ring1Scale, ring1Opacity, 0);
    pulseRing(ring2Scale, ring2Opacity, 700);

    const sparkle = (ref, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(ref, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(ref, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.delay(1200),
        ])
      ).start();
    };
    sparkle(sparkle1Opacity, 300);
    sparkle(sparkle2Opacity, 800);
    sparkle(sparkle3Opacity, 1400);

    // Countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => { if (onFinish) onFinish(); }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const rotateInterpolation = gradientRotate.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });
  const iconRotateInterp = iconRotate.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });
  const glowOpacity = iconGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a0b2e" />

      {/* Moving background */}
      <Animated.View style={[StyleSheet.absoluteFill, {
        transform: [{ translateX: gradientX }, { translateY: gradientY }, { rotate: rotateInterpolation }],
      }]}>
        <LinearGradient
          colors={['#1a0b2e','#310b8a','#9e0954','#28037e','#2d1b4e','#1a0b2e']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: width * 4, height: height * 4 }}
        />
      </Animated.View>

      <Animated.View style={[styles.wrapper, { opacity: contentFadeIn, transform: [{ scale: scaleAnim }] }]}>

        {/* TOP: ClassBack title */}
        <View style={styles.topSection}>
          <View style={styles.titleWrapper}>
            <Text style={[styles.titleText, { color: '#ffffff' }]}>Class</Text>
            <Text style={[styles.titleText, { color: '#f472b6' }]}>Back</Text>
          </View>
        </View>

        {/* MIDDLE: Lottie animation */}
        <View style={styles.middleSpace}>
          <Animated.View style={[styles.lottieWrapper, {
            transform: [{ translateY: iconFloat }, { scale: iconScale }],
          }]}>
            <LottieView
              source={require('../../assets/shopping cart.json')}
              autoPlay
              loop
              style={styles.lottie}
            />
          </Animated.View>
          <Text style={styles.iconLabel}>Classroom Feedback System</Text>
        </View>

        {/* BOTTOM: countdown + dots */}
        <View style={styles.bottomSection}>
          <Text style={styles.countdownText}>Redirecting in {countdown}...</Text>
          <View style={styles.dotsContainer}>
            {[0, 1, 2].map((i) => (
              <Animated.View key={i} style={[styles.dot, {
                opacity: dotsAnim,
                transform: [{ scale: dotsAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
              }]} />
            ))}
          </View>
        </View>

      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1a0b2e',
    alignItems: 'center', justifyContent: 'space-between',
    paddingTop: height * 0.07, paddingBottom: height * 0.10,
  },
  wrapper: {
    flex: 1, width: '100%',
    alignItems: 'center', justifyContent: 'space-between',
    paddingTop: height * 0.10, paddingBottom: height * 0.03,
    paddingHorizontal: 24,
  },
  topSection: { alignItems: 'center' },
  titleWrapper: { flexDirection: 'row', alignItems: 'center' },
  titleText: {
    fontFamily: CURSIVE_FONT, fontSize: 54,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10,
  },
  middleSpace: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lottieWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  lottie: { width: 250, height: 250 },
  iconLabel: {
    fontSize: 13, color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  bottomSection: { alignItems: 'center', gap: 8 },
  countdownText: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  dotsContainer: { flexDirection: 'row', gap: 12 },
  dot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff',
    shadowColor: '#ffffff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 8,
  },
});

export default SplashScreen;