import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/lib/test-utils/render';
import OnboardingScreen from '../../../../app/(auth)/onboarding';

const mockReplace = jest.fn();
const mockCompleteOnboarding = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  router: { replace: mockReplace },
}));

jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    jest
      .fn()
      .mockImplementation((selector: (s: object) => unknown) =>
        selector({ isLoading: false, error: null }),
      ),
    {
      getState: () => ({ completeOnboarding: mockCompleteOnboarding }),
      setState: jest.fn(),
    },
  ),
}));

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the first screen title', () => {
    const { getByText } = renderWithProviders(<OnboardingScreen />);
    expect(getByText('Anonymous, by design')).toBeTruthy();
  });

  it('has 3 pages navigable by "Next"', async () => {
    const { getByText, getByLabelText } = renderWithProviders(<OnboardingScreen />);

    // Page 1
    expect(getByText('Anonymous, by design')).toBeTruthy();

    fireEvent.press(getByText('Next'));

    // Page 2
    await waitFor(() => {
      expect(getByText('Small conversations')).toBeTruthy();
    });

    fireEvent.press(getByText('Next'));

    // Page 3 — last page shows "Get started" not "Next"
    await waitFor(() => {
      expect(getByText('9 categories, no algorithm')).toBeTruthy();
      expect(getByLabelText('Get started')).toBeTruthy();
    });
  });

  it('skip on page 1 calls completeOnboarding', async () => {
    const { getByText } = renderWithProviders(<OnboardingScreen />);

    fireEvent.press(getByText('Skip'));

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalled();
    });
  });

  it('completing all 3 screens calls completeOnboarding', async () => {
    const { getByText, getByLabelText } = renderWithProviders(<OnboardingScreen />);

    fireEvent.press(getByText('Next'));
    fireEvent.press(getByText('Next'));

    await waitFor(() => {
      expect(getByLabelText('Get started')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Get started'));

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    });
  });
});
