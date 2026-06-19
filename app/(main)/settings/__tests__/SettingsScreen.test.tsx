// Settings screen — Language section.
//
// Asserts the segmented control reflects the current preference and that
// tapping a segment invokes the mutation hook. Mocks the mutation hook to
// keep the test focused on the screen wiring.

import { render, fireEvent } from '@testing-library/react-native';
import SettingsScreen from '../index';

const mockSetPreference = jest.fn(() => Promise.resolve());
let mockCurrentPref: 'sv' | 'en' | 'system' = 'system';

jest.mock('@/features/locale/api/useLanguagePreference', () => ({
  useLanguagePreference: () => ({
    preference: mockCurrentPref,
    setPreference: mockSetPreference,
    isPending: false,
  }),
}));

jest.mock('@/features/auth/api/useLogout', () => ({
  useLogout: () => ({ logout: jest.fn() }),
}));

jest.mock('@/features/moderation/api/useIsModerator', () => ({
  useIsModerator: () => ({ data: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => unknown;

jest.mock('@/features/auth/store/useAuthStore', () => {
  const mockState = { session: { user: { email: 'test@example.com', id: 'u1' } } };
  function useAuthStoreMock(selector: unknown): unknown {
    return typeof selector === 'function' ? (selector as AnyFn)(mockState) : mockState;
  }
  return { useAuthStore: useAuthStoreMock };
});

beforeEach(() => {
  mockCurrentPref = 'system';
  mockSetPreference.mockClear();
});

describe('SettingsScreen — Language section', () => {
  it('renders three options: System, Svenska, English', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-language-system')).toBeOnTheScreen();
    expect(getByTestId('settings-language-sv')).toBeOnTheScreen();
    expect(getByTestId('settings-language-en')).toBeOnTheScreen();
  });

  it('marks the current preference as selected', () => {
    mockCurrentPref = 'en';
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-language-en').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(getByTestId('settings-language-sv').props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('invokes setPreference("sv") when the Svenska segment is tapped', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-language-sv'));
    expect(mockSetPreference).toHaveBeenCalledWith('sv');
  });

  it('invokes setPreference("system") when the System segment is tapped', () => {
    mockCurrentPref = 'en';
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-language-system'));
    expect(mockSetPreference).toHaveBeenCalledWith('system');
  });
});
