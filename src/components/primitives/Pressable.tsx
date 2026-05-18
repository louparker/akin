import React, { useRef, useEffect } from 'react';
import {
  Animated,
  AccessibilityInfo,
  Pressable as RNPressable,
  type PressableProps,
  type GestureResponderEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

type AkinPressableProps = PressableProps & {
  children?: React.ReactNode;
};

export function Pressable({
  onPress,
  onPressIn,
  onPressOut,
  accessibilityRole = 'button',
  disabled,
  children,
  ...props
}: AkinPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const reducedMotion = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reducedMotion.current = v;
    });
  }, []);

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!reducedMotion.current) {
      Animated.timing(scale, { toValue: 0.98, duration: 100, useNativeDriver: true }).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!reducedMotion.current) {
      Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    void Haptics.selectionAsync();
    onPress?.(e);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <RNPressable
        accessibilityRole={accessibilityRole}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        {...props}
      >
        {children}
      </RNPressable>
    </Animated.View>
  );
}
