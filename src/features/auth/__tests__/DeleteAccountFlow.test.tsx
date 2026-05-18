import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/lib/test-utils/render';
import DeleteAccountScreen from '../../../../app/(main)/delete-account';

const mockDeleteAccount = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
  router: { replace: jest.fn() },
}));

jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    jest
      .fn()
      .mockImplementation((selector: (s: object) => unknown) =>
        selector({ isLoading: false, error: null }),
      ),
    {
      getState: () => ({ deleteAccount: mockDeleteAccount }),
      setState: jest.fn(),
    },
  ),
}));

describe('DeleteAccountFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks proceeding past step 1 without reading the warning (Continue button exists)', () => {
    const { getByText } = renderWithProviders(<DeleteAccountScreen />);
    // Step 1 shows the warning text
    expect(getByText('Are you sure?')).toBeTruthy();
    // Continue button should be present
    expect(getByText('Continue')).toBeTruthy();
  });

  it('step 2 blocks unless the confirmation phrase is typed exactly', async () => {
    const { getByText, queryByText } = renderWithProviders(<DeleteAccountScreen />);

    // Advance to step 2
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(getByText('Delete permanently')).toBeTruthy();
    });

    // Pressing without typing phrase should show error
    fireEvent.press(getByText('Delete permanently'));

    await waitFor(() => {
      // Error should appear — "delete my account" phrase required
      expect(queryByText(/Please type the phrase exactly/i)).toBeTruthy();
    });
  });

  it('step 3 calls deleteAccount with the password', async () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />);

    // Step 1 → Continue
    fireEvent.press(getByText('Continue'));

    // Step 2: type the phrase
    await waitFor(() => {
      expect(getByText('Delete permanently')).toBeTruthy();
    });
    fireEvent.changeText(getByPlaceholderText('delete my account'), 'delete my account');
    fireEvent.press(getByText('Delete permanently'));

    // Step 3: enter password
    await waitFor(() => {
      expect(getByPlaceholderText('••••••••')).toBeTruthy();
    });
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'mypassword');
    fireEvent.press(getByText('Delete permanently'));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith('mypassword');
    });
  });
});
