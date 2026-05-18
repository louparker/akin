/**
 * Manual Jest stub for react-native-reanimated.
 *
 * The official mock (react-native-reanimated/mock) transitively imports
 * react-native-worklets which tries to initialise native code and crashes in
 * the Jest/Node environment. This hand-rolled stub provides just enough shape
 * for the components under test (useSharedValue, useAnimatedStyle, withTiming,
 * useReducedMotion, Animated.View).
 */

import React from 'react';
import { View, type ViewProps } from 'react-native';

type SharedValue<T> = { value: T };
type AnimatedStyle = Record<string, unknown>;

export function useSharedValue<T>(initial: T): SharedValue<T> {
  return { value: initial };
}

export function useAnimatedStyle(_fn: () => AnimatedStyle): AnimatedStyle {
  return {};
}

export function withTiming<T>(toValue: T, _options?: unknown): T {
  return toValue;
}

export function withSpring<T>(toValue: T, _options?: unknown): T {
  return toValue;
}

export function useReducedMotion(): boolean {
  return false;
}

export function runOnJS<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return fn;
}

export function runOnUI<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return fn;
}

// Animated.View — just a regular View in tests
const AnimatedViewComponent = React.forwardRef<View, ViewProps>((props, ref) =>
  React.createElement(View, { ...props, ref }),
);
AnimatedViewComponent.displayName = 'Animated.View';

const Animated = {
  View: AnimatedViewComponent,
  Text: View,
  ScrollView: View,
  Image: View,
  createAnimatedComponent: (Component: React.ComponentType) => Component,
};

export default Animated;

// Named export used by <Animated.View> JSX in _layout.tsx
export { AnimatedViewComponent as View };
