import React from 'react';
import { screen } from '@testing-library/react-native';
import { View } from '@/components/primitives/View';
import { renderWithProviders } from '@/lib/test-utils/render';
import { Text } from 'react-native';

describe('View', () => {
  it('renders children', () => {
    renderWithProviders(
      <View>
        <Text>hello</Text>
      </View>,
    );
    expect(screen.getByText('hello')).toBeOnTheScreen();
  });

  it('forwards testID', () => {
    renderWithProviders(<View testID="my-view" />);
    expect(screen.getByTestId('my-view')).toBeOnTheScreen();
  });

  it('forwards accessibilityRole', () => {
    renderWithProviders(<View testID="v" accessibilityRole="header" />);
    const el = screen.getByTestId('v');
    expect(el.props.accessibilityRole).toBe('header');
  });
});
