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

beforeAll(() =>
  supabaseServer.listen({
    // Warn (not error) on unhandled requests — catches gaps in mocking without
    // failing unrelated tests.
    onUnhandledRequest: 'warn',
  }),
);

afterEach(() => supabaseServer.resetHandlers());

afterAll(() => supabaseServer.close());
