// Settings screen — Language, Appearance, and Blocked sections.
//
// Asserts each segmented control reflects the current preference and that
// tapping a segment invokes the correct hook. Hooks are mocked to keep tests
// focused on screen wiring.

import { render, fireEvent } from '@testing-library/react-native';
import SettingsScreen from '../index';

const mockSetLanguagePref = jest.fn(() => Promise.resolve());
let mockCurrentLangPref: 'sv' | 'en' | 'system' = 'system';

const mockSetThemePref = jest.fn();
let mockCurrentThemePref: 'system' | 'light' | 'dark' = 'system';

type MockBlock = { blocked_id: string; blocked_identifier: string; created_at: string };
let mockBlocks: MockBlock[] = [];
const mockUnblock = jest.fn(() => Promise.resolve());

jest.mock('@/features/locale/api/useLanguagePreference', () => ({
  useLanguagePreference: () => ({
    preference: mockCurrentLangPref,
    setPreference: mockSetLanguagePref,
    isPending: false,
  }),
}));

jest.mock('@/features/theme/store/useThemeStore', () => ({
  useThemeStore: (
    selector: (s: { preference: string; setPreference: (p: string) => void }) => unknown,
  ) => selector({ preference: mockCurrentThemePref, setPreference: mockSetThemePref }),
}));

jest.mock('@/features/post/api/useMyBlocks', () => ({
  useMyBlocks: () => ({ data: mockBlocks, isLoading: false }),
}));

jest.mock('@/features/post/api/useUnblock', () => ({
  useUnblock: () => ({ mutate: mockUnblock, isPending: false }),
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
  mockCurrentLangPref = 'system';
  mockSetLanguagePref.mockClear();
  mockCurrentThemePref = 'system';
  mockSetThemePref.mockClear();
  mockBlocks = [];
  mockUnblock.mockClear();
});

describe('SettingsScreen — Language section', () => {
  it('renders three options: System, Svenska, English', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-language-system')).toBeOnTheScreen();
    expect(getByTestId('settings-language-sv')).toBeOnTheScreen();
    expect(getByTestId('settings-language-en')).toBeOnTheScreen();
  });

  it('marks the current preference as selected', () => {
    mockCurrentLangPref = 'en';
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
    expect(mockSetLanguagePref).toHaveBeenCalledWith('sv');
  });

  it('invokes setPreference("system") when the System segment is tapped', () => {
    mockCurrentLangPref = 'en';
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-language-system'));
    expect(mockSetLanguagePref).toHaveBeenCalledWith('system');
  });
});

describe('SettingsScreen — Appearance section', () => {
  it('renders three options: System, Light, Dark', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-appearance-system')).toBeOnTheScreen();
    expect(getByTestId('settings-appearance-light')).toBeOnTheScreen();
    expect(getByTestId('settings-appearance-dark')).toBeOnTheScreen();
  });

  it('marks the current theme preference as selected', () => {
    mockCurrentThemePref = 'dark';
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-appearance-dark').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(getByTestId('settings-appearance-light').props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('invokes setPreference("dark") when the Dark segment is tapped', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-appearance-dark'));
    expect(mockSetThemePref).toHaveBeenCalledWith('dark');
  });

  it('invokes setPreference("system") when the System segment is tapped', () => {
    mockCurrentThemePref = 'light';
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-appearance-system'));
    expect(mockSetThemePref).toHaveBeenCalledWith('system');
  });
});

describe('SettingsScreen — Blocked users section', () => {
  it('shows empty state when no users are blocked', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText("You haven't blocked anyone.")).toBeOnTheScreen();
  });

  it('renders each blocked user identifier', () => {
    mockBlocks = [
      { blocked_id: 'u2', blocked_identifier: 'BlueFox11', created_at: '2026-01-01' },
      { blocked_id: 'u3', blocked_identifier: 'GreenOwl22', created_at: '2026-01-02' },
    ];
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('BlueFox11')).toBeOnTheScreen();
    expect(getByText('GreenOwl22')).toBeOnTheScreen();
  });

  it('calls unblock with the correct blocked_id when Unblock is pressed', () => {
    mockBlocks = [{ blocked_id: 'u2', blocked_identifier: 'BlueFox11', created_at: '2026-01-01' }];
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('unblock-u2'));
    expect(mockUnblock).toHaveBeenCalledWith('u2');
  });
});
