/* eslint-disable react-native/no-raw-text -- Button wraps children in Text internally; string children are needed to test rendering */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { Button } from '@/components/primitives/Button';
import { renderWithProviders } from '@/lib/test-utils/render';

describe('Button', () => {
  it('renders its children', () => {
    renderWithProviders(<Button>{'Continue'}</Button>);
    expect(screen.getByText('Continue')).toBeOnTheScreen();
  });

  it('has accessibilityRole="button"', () => {
    renderWithProviders(<Button>{'x'}</Button>);
    expect(screen.getByRole('button')).toBeOnTheScreen();
  });

  it('forwards accessibilityLabel', () => {
    renderWithProviders(<Button accessibilityLabel="Submit form">{'Submit'}</Button>);
    expect(screen.getByLabelText('Submit form')).toBeOnTheScreen();
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'renders variant=%s without crashing',
    (kind) => {
      renderWithProviders(<Button kind={kind}>{'Label'}</Button>);
      expect(screen.getByText('Label')).toBeOnTheScreen();
    },
  );

  it.each(['sm', 'md', 'lg'] as const)('renders size=%s without crashing', (size) => {
    renderWithProviders(<Button size={size}>{'Label'}</Button>);
    expect(screen.getByText('Label')).toBeOnTheScreen();
  });

  it('calls onPress when not disabled', () => {
    const onPress = jest.fn();
    renderWithProviders(<Button onPress={onPress}>{'Go'}</Button>);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <Button disabled onPress={onPress}>
        {'Go'}
      </Button>,
    );
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner and hides text when loading', () => {
    renderWithProviders(<Button loading>{'Continue'}</Button>);
    expect(screen.getByTestId('button-spinner')).toBeOnTheScreen();
    expect(screen.queryByText('Continue')).toBeNull();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <Button loading onPress={onPress}>
        {'Go'}
      </Button>,
    );
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
