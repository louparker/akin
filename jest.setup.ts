// RTL 13+ auto-loads its matchers when any RTL import runs — no extend-expect needed.
import { supabaseServer } from '@/lib/test-utils/supabase-mock';

// react-native's Settings module (iOS) calls TurboModuleRegistry.getEnforcing
// ('SettingsManager') at import time. The native module doesn't exist in jest,
// so any test that mounts code touching `Settings` crashes with an Invariant
// Violation. Stub NativeSettingsManager with an empty constants payload so
// Settings.get(key) returns undefined cleanly.
jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  __esModule: true,
  default: {
    getConstants: () => ({ settings: {} }),
    setValues: jest.fn(),
    deleteValues: jest.fn(),
  },
}));

// AsyncStorage native module isn't available in Jest. Tests that need to
// inspect persisted values can still re-mock this module locally to capture
// setItem/getItem calls — this default just keeps the module loadable.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      setItem: jest.fn((k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      }),
      getItem: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      removeItem: jest.fn((k: string) => {
        store.delete(k);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
    },
  };
});

// expo-notifications initialises native notification emitters on import. In the
// Jest runtime those native objects are absent, and getLastNotificationResponse()
// can crash while mapping an undefined native response. Keep a complete default
// mock here so any test that imports auth/root-layout code does not load the
// real native module by accident.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 'default' },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExpoPushToken[jest-token]' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
}));

beforeAll(() =>
  supabaseServer.listen({
    // Warn (not error) on unhandled requests — catches gaps in mocking without
    // failing unrelated tests.
    onUnhandledRequest: 'warn',
  }),
);

afterEach(() => supabaseServer.resetHandlers());

afterAll(() => supabaseServer.close());
