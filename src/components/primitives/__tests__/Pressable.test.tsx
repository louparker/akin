import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
// useReducedMotion is controlled via the Reanimated stub which returns false by default.
// Import it so we can spy on it per-test.
import * as Reanimated from 'react-native-reanimated';
import { Pressable } from '@/components/primitives/Pressable';
import { renderWithProviders } from '@/lib/test-utils/render';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('Pressable', () => {
  it('renders children', () => {
    renderWithProviders(
      <Pressable>
        <Text>tap me</Text>
      </Pressable>,
    );
    expect(screen.getByText('tap me')).toBeOnTheScreen();
  });

  it('has accessibilityRole="button" by default', () => {
    renderWithProviders(
      <Pressable testID="p">
        <Text>x</Text>
      </Pressable>,
    );
    // The inner RN Pressable carries the role; find by role
    expect(screen.getByRole('button')).toBeOnTheScreen();
  });

  it('forwards a custom accessibilityRole', () => {
    renderWithProviders(
      <Pressable testID="p" accessibilityRole="link">
        <Text>x</Text>
      </Pressable>,
    );
    expect(screen.getByRole('link')).toBeOnTheScreen();
  });

  it('forwards accessibilityLabel', () => {
    renderWithProviders(
      <Pressable accessibilityLabel="Press me">
        <Text>x</Text>
      </Pressable>,
    );
    expect(screen.getByLabelText('Press me')).toBeOnTheScreen();
  });

  it('calls onPress handler', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <Pressable onPress={onPress}>
        <Text>x</Text>
      </Pressable>,
    );
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('triggers a haptic on press', () => {
    const Haptics = jest.requireMock<{ selectionAsync: jest.Mock }>('expo-haptics');
    Haptics.selectionAsync.mockClear();

    renderWithProviders(
      <Pressable>
        <Text>x</Text>
      </Pressable>,
    );
    fireEvent.press(screen.getByRole('button'));
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('skips scale animation when useReducedMotion is true', () => {
    const spy = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    const withTimingSpy = jest.spyOn(Reanimated, 'withTiming');

    renderWithProviders(
      <Pressable>
        <Text>x</Text>
      </Pressable>,
    );
    fireEvent(screen.getByRole('button'), 'pressIn');
    fireEvent(screen.getByRole('button'), 'pressOut');

    expect(withTimingSpy).not.toHaveBeenCalled();
    spy.mockRestore();
    withTimingSpy.mockRestore();
  });
});
