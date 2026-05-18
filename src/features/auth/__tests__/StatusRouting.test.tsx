import React from 'react';
import { renderWithProviders } from '@/lib/test-utils/render';
import { BannedScreen } from '@/components/composed/BannedScreen';
import SuspendedScreen from '@/components/composed/SuspendedScreen';

jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    jest
      .fn()
      .mockImplementation((selector: (s: object) => unknown) =>
        selector({ isLoading: false, error: null, profile: null }),
      ),
    {
      getState: () => ({ signOut: jest.fn() }),
      setState: jest.fn(),
    },
  ),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  router: { replace: jest.fn() },
}));

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

  it('renders the logout button', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const { getByLabelText } = renderWithProviders(<SuspendedScreen suspendedUntil={future} />);
    expect(getByLabelText('Log out')).toBeTruthy();
  });
});
