import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../store/useThemeStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      setItem: jest.fn((k: string, v: string) => {
        // eslint-disable-next-line security/detect-object-injection
        store[k] = v;
        return Promise.resolve();
      }),
      getItem: jest.fn(
        // eslint-disable-next-line security/detect-object-injection
        (k: string) => Promise.resolve(store[k] ?? null),
      ),
      removeItem: jest.fn((k: string) => {
        // eslint-disable-next-line security/detect-object-injection
        delete store[k];
        return Promise.resolve();
      }),
      __store: store,
    },
  };
});

const STORAGE_KEY = 'akin.themePrefs.v1';

beforeEach(() => {
  useThemeStore.setState({ preference: 'system' });
  const mockStore = (AsyncStorage as unknown as { __store: Record<string, string> }).__store;
  for (const k of Object.keys(mockStore)) {
    // eslint-disable-next-line security/detect-object-injection
    delete mockStore[k];
  }
  jest.clearAllMocks();
});

describe('useThemeStore', () => {
  it('defaults preference to "system" before hydration', () => {
    expect(useThemeStore.getState().preference).toBe('system');
  });

  it('setPreference("light") updates the in-memory state', () => {
    useThemeStore.getState().setPreference('light');
    expect(useThemeStore.getState().preference).toBe('light');
  });

  it('setPreference("dark") updates the in-memory state', () => {
    useThemeStore.getState().setPreference('dark');
    expect(useThemeStore.getState().preference).toBe('dark');
  });

  it('setPreference persists the choice under akin.themePrefs.v1', async () => {
    useThemeStore.getState().setPreference('dark');
    await new Promise((r) => setTimeout(r, 0));

    const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
    const persisted = calls.find(([k]) => k === STORAGE_KEY);
    expect(persisted).toBeDefined();
    const payload = JSON.parse(persisted![1] as string) as {
      state: { preference: string };
    };
    expect(payload.state.preference).toBe('dark');
  });

  it('only persists the preference field — not action methods', async () => {
    useThemeStore.getState().setPreference('light');
    await new Promise((r) => setTimeout(r, 0));

    const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
    const persisted = calls.find(([k]) => k === STORAGE_KEY);
    const payload = JSON.parse(persisted![1] as string) as { state: Record<string, unknown> };
    expect(Object.keys(payload.state)).toEqual(['preference']);
  });
});
