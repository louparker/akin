// Settings screen — Language, Appearance, Blocked, Legal, and Support sections.
//
// Asserts each toggle row reflects the current preference and that flipping a
// row's switch on invokes the correct hook. Hooks and native modules are mocked
// to keep tests focused on screen wiring.

import { render, fireEvent, act } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { a11yCheck } from '@/lib/test-utils';
import SettingsScreen from '../index';

jest.mock('@/lib/appConfig', () => ({
  legalConfig: {
    privacyUrl: 'https://ourakin.com/privacy',
    termsUrl: 'https://ourakin.com/terms',
    guidelinesUrl: 'https://ourakin.com/community-guidelines',
    dataRequestsUrl: 'https://ourakin.com/privacy/requests',
  },
  supportConfig: { feedbackEmail: 'feedback@ourakin.com' },
  appVersion: '1.2.3',
}));

let mockLinkingSpy: jest.SpyInstance;

const mockSetLanguagePref = jest.fn(() => Promise.resolve());
let mockCurrentLangPref: 'sv' | 'en' | 'system' = 'system';

const mockSetThemePref = jest.fn();
let mockCurrentThemePref: 'system' | 'light' | 'dark' = 'system';

const mockSetPushRepliesEnabled: jest.Mock<Promise<void>, [boolean]> = jest.fn((_enabled) =>
  Promise.resolve(),
);
let mockPushRepliesEnabled = false;
let mockNotificationPending = false;

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

jest.mock('@/features/notifications/api/useNotificationPreference', () => ({
  useNotificationPreference: () => ({
    data: { pushReplies: mockPushRepliesEnabled },
    isLoading: false,
  }),
  useSetPushRepliesPreference: () => ({
    mutate: (enabled: boolean) => mockSetPushRepliesEnabled(enabled),
    isPending: mockNotificationPending,
  }),
  PushPermissionError: class PushPermissionError extends Error {},
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
  mockPushRepliesEnabled = false;
  mockNotificationPending = false;
  mockSetPushRepliesEnabled.mockClear();
  mockBlocks = [];
  mockUnblock.mockClear();
  mockLinkingSpy = jest.spyOn(ReactNative.Linking, 'openURL').mockResolvedValue(undefined);
});

afterEach(() => {
  mockLinkingSpy.mockRestore();
  jest.useRealTimers();
});

describe('SettingsScreen — Language section', () => {
  it('renders three options: System, Svenska, English', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-language-system')).toBeOnTheScreen();
    expect(getByTestId('settings-language-sv')).toBeOnTheScreen();
    expect(getByTestId('settings-language-en')).toBeOnTheScreen();
  });

  it('switches the current preference on and the others off', () => {
    mockCurrentLangPref = 'en';
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-language-en').props.value).toBe(true);
    expect(getByTestId('settings-language-sv').props.value).toBe(false);
    expect(getByTestId('settings-language-system').props.value).toBe(false);
  });

  it('invokes setPreference("sv") when the Svenska row is switched on', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent(getByTestId('settings-language-sv'), 'valueChange', true);
    expect(mockSetLanguagePref).toHaveBeenCalledWith('sv');
  });

  it('keeps the newly selected language on when the switching overlay clears', async () => {
    jest.useFakeTimers();
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent(getByTestId('settings-language-sv'), 'valueChange', true);
    expect(getByTestId('settings-language-sv').props.value).toBe(true);
    expect(getByTestId('settings-language-system').props.value).toBe(false);

    await act(async () => {});
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(getByTestId('settings-language-sv').props.value).toBe(true);
    expect(getByTestId('settings-language-system').props.value).toBe(false);
  });

  it('invokes setPreference("system") when the System row is switched on', () => {
    mockCurrentLangPref = 'en';
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent(getByTestId('settings-language-system'), 'valueChange', true);
    expect(mockSetLanguagePref).toHaveBeenCalledWith('system');
  });

  it('does not re-invoke setPreference when the already-selected row is toggled off', () => {
    mockCurrentLangPref = 'en';
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent(getByTestId('settings-language-en'), 'valueChange', false);
    expect(mockSetLanguagePref).not.toHaveBeenCalled();
  });
});

describe('SettingsScreen — Appearance section', () => {
  it('renders three options: System, Light, Dark', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-appearance-system')).toBeOnTheScreen();
    expect(getByTestId('settings-appearance-light')).toBeOnTheScreen();
    expect(getByTestId('settings-appearance-dark')).toBeOnTheScreen();
  });

  it('switches the current theme preference on and the others off', () => {
    mockCurrentThemePref = 'dark';
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-appearance-dark').props.value).toBe(true);
    expect(getByTestId('settings-appearance-light').props.value).toBe(false);
  });

  it('invokes setPreference("dark") when the Dark row is switched on', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent(getByTestId('settings-appearance-dark'), 'valueChange', true);
    expect(mockSetThemePref).toHaveBeenCalledWith('dark');
  });

  it('invokes setPreference("system") when the System row is switched on', () => {
    mockCurrentThemePref = 'light';
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent(getByTestId('settings-appearance-system'), 'valueChange', true);
    expect(mockSetThemePref).toHaveBeenCalledWith('system');
  });
});

describe('SettingsScreen — Notifications section', () => {
  it('renders the conversation replies push toggle', () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);
    expect(getByText('Conversation replies')).toBeOnTheScreen();
    expect(getByTestId('settings-notifications-replies').props.value).toBe(false);
  });

  it('reflects an enabled push preference', () => {
    mockPushRepliesEnabled = true;
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-notifications-replies').props.value).toBe(true);
  });

  it('invokes the push preference mutation when toggled on', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent(getByTestId('settings-notifications-replies'), 'valueChange', true);
    expect(mockSetPushRepliesEnabled).toHaveBeenCalledWith(true);
  });

  it('disables the push toggle while the preference is saving', () => {
    mockNotificationPending = true;
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-notifications-replies').props.disabled).toBe(true);
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

describe('SettingsScreen — Legal + Support sections', () => {
  it('opens the privacy URL when Privacy Policy row is pressed', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-legal-privacy'));
    expect(mockLinkingSpy).toHaveBeenCalledWith('https://ourakin.com/privacy');
  });

  it('opens the terms URL when Terms of Service row is pressed', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-legal-terms'));
    expect(mockLinkingSpy).toHaveBeenCalledWith('https://ourakin.com/terms');
  });

  it('opens the guidelines URL when Community Guidelines row is pressed', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-legal-guidelines'));
    expect(mockLinkingSpy).toHaveBeenCalledWith('https://ourakin.com/community-guidelines');
  });

  it('opens the data requests URL when Your Data row is pressed', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-legal-your-data'));
    expect(mockLinkingSpy).toHaveBeenCalledWith('https://ourakin.com/privacy/requests');
  });

  it('opens a mailto link when Send feedback is pressed', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-support-feedback'));
    expect(mockLinkingSpy).toHaveBeenCalledWith('mailto:feedback@ourakin.com');
  });

  it('displays the app version string', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('1.2.3')).toBeOnTheScreen();
  });
});

describe('SettingsScreen — accessibility', () => {
  it('passes a11y checks with no blocked users', () => {
    const { root } = render(<SettingsScreen />);
    expect(a11yCheck(root)).toEqual([]);
  });

  it('passes a11y checks with blocked users present', () => {
    mockBlocks = [{ blocked_id: 'u2', blocked_identifier: 'BlueFox11', created_at: '2026-01-01' }];
    const { root } = render(<SettingsScreen />);
    expect(a11yCheck(root)).toEqual([]);
  });

  it('section titles are announced as headings', () => {
    const { getAllByRole } = render(<SettingsScreen />);
    const headings = getAllByRole('header');
    expect(headings.length).toBeGreaterThanOrEqual(4);
  });
});
