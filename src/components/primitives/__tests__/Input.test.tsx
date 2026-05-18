import React from 'react';
import { screen } from '@testing-library/react-native';
import { Input } from '@/components/primitives/Input';
import { renderWithProviders } from '@/lib/test-utils/render';

describe('Input', () => {
  const base = { label: 'Email', value: '', onChangeText: jest.fn() };

  it('renders the label', () => {
    renderWithProviders(<Input {...base} />);
    expect(screen.getByText('EMAIL')).toBeOnTheScreen();
  });

  it('renders a hint when provided', () => {
    renderWithProviders(<Input {...base} hint="At least 8 characters." />);
    expect(screen.getByText('At least 8 characters.')).toBeOnTheScreen();
  });

  it('uses label as the default accessibilityLabel', () => {
    renderWithProviders(<Input {...base} />);
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
  });

  it('forwards a custom accessibilityLabel', () => {
    renderWithProviders(<Input {...base} accessibilityLabel="Email address" />);
    expect(screen.getByLabelText('Email address')).toBeOnTheScreen();
  });

  it('shows error text when error prop is provided', () => {
    renderWithProviders(<Input {...base} error="Email is required." />);
    expect(screen.getByText('Email is required.')).toBeOnTheScreen();
  });

  it('does not show error text when error is absent', () => {
    renderWithProviders(<Input {...base} />);
    expect(screen.queryByTestId('input-error')).toBeNull();
  });

  it('marks the input as aria-invalid when error is set', () => {
    renderWithProviders(<Input {...base} error="Required" testID="inp" />);
    const input = screen.getByTestId('inp');
    expect(input.props['aria-invalid']).toBe(true);
  });

  it('input is not marked invalid when no error', () => {
    renderWithProviders(<Input {...base} testID="inp" />);
    const input = screen.getByTestId('inp');
    expect(input.props['aria-invalid']).toBeFalsy();
  });
});
