import React from 'react';
import { act, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/lib/test-utils/render';
import IdentifierScreen from '../../../../app/(auth)/identifier';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  router: { replace: jest.fn() },
}));

const mockGetState = {
  generateIdentifier: jest.fn(),
  confirmIdentifier: jest.fn(),
  clearError: jest.fn(),
};

// Module-level state object — updated by helpers before each test.
// Named with `mock` prefix so Jest's babel hoist allows it in the factory.
let mockStoreProfile: { anonymous_identifier: string } | null = null;
let mockStoreIsLoading = false;
let mockStoreError: string | null = null;

jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    jest.fn().mockImplementation((selector: (s: object) => unknown) =>
      selector({
        profile: mockStoreProfile,
        isLoading: mockStoreIsLoading,
        error: mockStoreError,
        session: { user: { id: 'user-1' } },
      }),
    ),
    {
      getState: () => mockGetState,
      setState: jest.fn(),
    },
  ),
}));

describe('IdentifierScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    // Reset store state to defaults
    mockStoreProfile = null;
    mockStoreIsLoading = false;
    mockStoreError = null;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a loading state when identifier is pending_NNN', () => {
    mockStoreProfile = { anonymous_identifier: 'pending_001' };
    const { getByTestId } = renderWithProviders(<IdentifierScreen />);
    expect(getByTestId('identifier-loading')).toBeTruthy();
  });

  it('shows the identifier when it is a real name', async () => {
    mockStoreProfile = { anonymous_identifier: 'CrimsonFox42' };
    const { getByText } = renderWithProviders(<IdentifierScreen />);
    await waitFor(() => {
      expect(getByText('CrimsonFox')).toBeTruthy();
      expect(getByText('42')).toBeTruthy();
    });
  });

  it('shows a loading state when profile is null', () => {
    mockStoreProfile = null;
    const { getByTestId } = renderWithProviders(<IdentifierScreen />);
    expect(getByTestId('identifier-loading')).toBeTruthy();
  });

  it('shows the error state when isLoading=false, profile=null after 10s', async () => {
    mockStoreProfile = null;
    mockStoreIsLoading = false;
    const { getByTestId } = renderWithProviders(<IdentifierScreen />);

    act(() => {
      jest.advanceTimersByTime(11_000);
    });

    await waitFor(() => {
      expect(getByTestId('identifier-error')).toBeTruthy();
    });
  });

  it('renders confirm and retry buttons when identifier is ready', async () => {
    mockStoreProfile = { anonymous_identifier: 'CrimsonFox42' };
    const { getByLabelText } = renderWithProviders(<IdentifierScreen />);

    await waitFor(() => {
      expect(getByLabelText('This is me')).toBeTruthy();
      expect(getByLabelText('Try another one')).toBeTruthy();
    });
  });
});
