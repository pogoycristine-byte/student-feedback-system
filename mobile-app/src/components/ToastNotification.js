import React, { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';

const TOAST_DURATION = 5000;

const ToastNotification = ({ toast, onDismiss, onPress }) => {
  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;

    translateY.setValue(-160);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => slideOut(), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast]);

  const slideOut = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -160, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => { if (onDismiss) onDismiss(); });
  };

  if (!toast) return null;

  const isMessage = toast.type === 'message';
  const topOffset = (StatusBar.currentHeight || 44);

  return (
    <Animated.View style={[styles.wrapper, { top: topOffset, transform: [{ translateY }], opacity }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => { slideOut(); if (onPress) onPress(toast); }}
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={1}>
              {isMessage ? 'New message' : 'Feedback status changed'}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {isMessage
                ? toast.preview || toast.subject
                : `"${toast.subject}" is now ${toast.status}`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={slideOut}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 99999,
  },
  card: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  textBlock: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
  },
  body: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  closeText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 2,
  },
});

export default ToastNotification;