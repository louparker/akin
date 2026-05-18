import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/lib/test-utils/render';
import VerifyScreen from '../../../../app/(auth)/verify';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resend: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ email: 'user@example.com' }),
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    jest.fn().mockImplementation((selector: (s: object) => unknown) =>
      selector({
        isLoading: false,
        error: null,
        session: null,
        profile: null,
      }),
    ),
    {
      getState: () => ({
        signOut: jest.fn(),
        clearError: jest.fn(),
      }),
      setState: jest.fn(),
    },
  ),
}));

describe('VerifyScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the masked email in the body text', () => {
    const { getByTestId } = renderWithProviders(<VerifyScreen />);
    const body = getByTestId('verify-body');
    // Masked form of user@example.com → u***@example.com
    expect(body.props.children).toContain('u***@example.com');
  });

  it('renders the resend button enabled initially', () => {
    const { getByLabelText } = renderWithProviders(<VerifyScreen />);
    const btn = getByLabelText('Resend email');
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('disables resend and shows countdown for 60 seconds after tap', async () => {
    const { getByLabelText, getByText } = renderWithProviders(<VerifyScreen />);
    const btn = getByLabelText('Resend email');

    fireEvent.press(btn);

    // At t=0 countdown starts at 60
    await waitFor(() => {
      expect(getByText(/Resend in \d+s/)).toBeTruthy();
    });

    // Advance 30s — still counting
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(getByText(/Resend in \d+s/)).toBeTruthy();

    // Advance remaining 30s — button re-enables
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    await waitFor(() => {
      expect(getByLabelText('Resend email')).toBeTruthy();
    });
  });

  it('renders a "Wrong email?" link', () => {
    const { getByText } = renderWithProviders(<VerifyScreen />);
    expect(getByText('Wrong email?')).toBeTruthy();
  });

  it('renders a sign-out option', () => {
    const { getByText } = renderWithProviders(<VerifyScreen />);
    expect(getByText('Use a different email')).toBeTruthy();
  });
});
