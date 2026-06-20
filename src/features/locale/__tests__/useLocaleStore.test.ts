import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocaleStore } from '../store/useLocaleStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      setItem: jest.fn((k: string, v: string) => {
        store[k] = v;
        return Promise.resolve();
      }),
      getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
      removeItem: jest.fn((k: string) => {
        delete store[k];
        return Promise.resolve();
      }),
      __store: store,
    },
  };
});

const STORAGE_KEY = 'akin.locale.v1';

beforeEach(() => {
  useLocaleStore.setState({ preference: 'system' });
  const mockStore = (AsyncStorage as unknown as { __store: Record<string, string> }).__store;
  for (const k of Object.keys(mockStore)) {
    delete mockStore[k];
  }
  jest.clearAllMocks();
});

describe('useLocaleStore', () => {
  it('defaults preference to "system" before hydration', () => {
    expect(useLocaleStore.getState().preference).toBe('system');
  });

  it('setPreference("en") updates the in-memory state', () => {
    useLocaleStore.getState().setPreference('en');
    expect(useLocaleStore.getState().preference).toBe('en');
  });

  it('setPreference("sv") updates the in-memory state', () => {
    useLocaleStore.getState().setPreference('sv');
    expect(useLocaleStore.getState().preference).toBe('sv');
  });

  it('setPreference persists the choice under akin.locale.v1', async () => {
    useLocaleStore.getState().setPreference('en');
    await new Promise((r) => setTimeout(r, 0));

    const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
    const persisted = calls.find(([k]) => k === STORAGE_KEY);
    expect(persisted).toBeDefined();
    const payload = JSON.parse(persisted![1] as string) as {
      state: { preference: string };
    };
    expect(payload.state.preference).toBe('en');
  });

  it('only persists the preference field — not action methods', async () => {
    useLocaleStore.getState().setPreference('sv');
    await new Promise((r) => setTimeout(r, 0));

    const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
    const persisted = calls.find(([k]) => k === STORAGE_KEY);
    const payload = JSON.parse(persisted![1] as string) as { state: Record<string, unknown> };
    expect(Object.keys(payload.state)).toEqual(['preference']);
  });
});
