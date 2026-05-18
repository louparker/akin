import React from 'react';
import {
  Pressable as RNPressable,
  type PressableProps,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
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
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!reducedMotion) {
      scale.value = withTiming(0.98, { duration: 100 });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!reducedMotion) {
      scale.value = withTiming(1, { duration: 200 });
    }
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    void Haptics.selectionAsync();
    onPress?.(e);
  };

  return (
    <Animated.View style={animatedStyle}>
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
