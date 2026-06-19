import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { renderWithProviders } from '@/lib/test-utils/render';
import { BannedScreen } from '@/components/composed/BannedScreen';
import SuspendedScreen from '@/components/composed/SuspendedScreen';

const mockSignOut = jest.fn();

jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    jest
      .fn()
      .mockImplementation((selector: (s: object) => unknown) =>
        selector({ isLoading: false, error: null, profile: null }),
      ),
    {
      getState: () => ({ signOut: mockSignOut }),
      setState: jest.fn(),
    },
  ),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  router: { replace: jest.fn() },
}));

beforeEach(() => {
  mockSignOut.mockReset();
});

describe('BannedScreen', () => {
  it('renders the banned title and logout button', () => {
    const { getByText, getByLabelText } = renderWithProviders(<BannedScreen />);
    expect(getByText(/Your account has been banned/i)).toBeTruthy();
    expect(getByLabelText('Log out')).toBeTruthy();
  });
});

describe('SuspendedScreen', () => {
  it('renders the suspended title with a future suspended_until', () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { getByText } = renderWithProviders(<SuspendedScreen suspendedUntil={future} />);
    expect(getByText(/Your account is suspended/i)).toBeTruthy();
  });

  it('renders the full-lockout body copy (not the old read-only copy)', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const { getByText, queryByText } = renderWithProviders(
      <SuspendedScreen suspendedUntil={future} />,
    );
    expect(getByText(/can't use Akin/i)).toBeTruthy();
    expect(queryByText(/can read posts/i)).toBeNull();
  });

  it('renders the absolute unsuspend datetime in the user locale', () => {
    // Use a specific UTC date so we can match a year token deterministically.
    const future = new Date('2030-04-15T08:30:00Z').toISOString();
    const { getByTestId } = renderWithProviders(
      <SuspendedScreen suspendedUntil={future} locale="en" />,
    );
    const text = String(getByTestId('suspended-until').props.children);
    expect(text).toMatch(/2030/);
    // Sanity: the Intl.DateTimeFormat 'long' style includes the month name.
    expect(text).toMatch(/April/);
  });

  it('renders the support email and opens mailto on press', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByTestId, getByText } = renderWithProviders(
      <SuspendedScreen suspendedUntil={future} />,
    );
    expect(getByText('hi@akin.app')).toBeTruthy();
    fireEvent.press(getByTestId('suspended-support-email'));
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^mailto:hi@akin\.app/));
    spy.mockRestore();
  });

  it('renders a "Back to login" button that calls signOut', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const { getByLabelText } = renderWithProviders(<SuspendedScreen suspendedUntil={future} />);
    const btn = getByLabelText('Back to login');
    fireEvent.press(btn);
    expect(mockSignOut).toHaveBeenCalled();
  });
});
