/**
 * Unit tests for src/lib/analytics.ts
 *
 * TDD: tests written before implementation.
 *
 * Key invariants under test:
 *  1. track() calls the PostHog client with scrubbed props.
 *  2. PII keys in props are stripped before sending.
 *  3. The PostHog distinct ID is a random UUID, never the auth.users.id.
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// jest.mock() calls are hoisted by Babel, so these imports always see the mocks.
import { PostHog } from 'posthog-react-native';
import { track, getDistinctId, _resetClientForTesting } from '@/lib/analytics';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCapture = jest.fn();

jest.mock('posthog-react-native', () => ({
  PostHog: jest.fn().mockImplementation(() => ({ capture: mockCapture })),
}));

// Mock expo-secure-store so we control what's persisted.
const mockGetItemAsync = jest.fn<Promise<string | null>, [string]>();
const mockSetItemAsync = jest.fn<Promise<void>, [string, string]>().mockResolvedValue(undefined);

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: [string]) => mockGetItemAsync(...args),
  setItemAsync: (...args: [string, string]) => mockSetItemAsync(...args),
}));

// Mock env so we don't need real keys.
jest.mock('@/lib/env', () => ({
  getEnv: () => ({
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'anon',
    sentryDsn: 'https://x@sentry.io/1',
    posthogKey: 'phk_test_key',
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** A loose UUID v4 regex. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Tests: track() ───────────────────────────────────────────────────────────

describe('track()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Simulate no stored distinct ID so a fresh one is generated.
    mockGetItemAsync.mockResolvedValue(null);
    mockSetItemAsync.mockResolvedValue(undefined);
  });

  it('calls PostHog capture with the event name and sanitised props', async () => {
    await track('post_created', { category: 'vent_space' });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    const [eventName, props] = mockCapture.mock.calls[0] as [string, Record<string, unknown>];
    expect(eventName).toBe('post_created');
    expect(props).toMatchObject({ category: 'vent_space' });
  });

  it('calls PostHog capture with the correct event name for app_opened', async () => {
    await track('app_opened');

    expect(mockCapture).toHaveBeenCalledTimes(1);
    const [eventName] = mockCapture.mock.calls[0] as [string, unknown];
    expect(eventName).toBe('app_opened');
  });

  it('strips PII key "email" from props before sending', async () => {
    // Cast to { category: string } to satisfy the track() signature while
    // deliberately injecting an extra PII key to test the scrubber.
    await track('post_created', { category: 'general', email: 'user@example.com' } as {
      category: string;
    });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    const [, props] = mockCapture.mock.calls[0] as [string, Record<string, unknown>];
    expect(props).not.toHaveProperty('email');
    // Non-PII prop is preserved.
    expect(props).toHaveProperty('category', 'general');
  });

  it('strips PII key "password" from props before sending', async () => {
    await track('post_created', { category: 'general', password: 'secret' } as {
      category: string;
    });

    const [, props] = mockCapture.mock.calls[0] as [string, Record<string, unknown>];
    expect(props).not.toHaveProperty('password');
  });

  it('strips PII key "token" from props before sending', async () => {
    await track('post_created', { category: 'general', token: 'abc123' } as { category: string });

    const [, props] = mockCapture.mock.calls[0] as [string, Record<string, unknown>];
    expect(props).not.toHaveProperty('token');
  });

  it('strips PII key "authorization" from props before sending', async () => {
    await track('post_created', { category: 'general', authorization: 'Bearer x' } as {
      category: string;
    });

    const [, props] = mockCapture.mock.calls[0] as [string, Record<string, unknown>];
    expect(props).not.toHaveProperty('authorization');
  });
});

// ─── Tests: getDistinctId() ───────────────────────────────────────────────────

describe('getDistinctId()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a UUID v4 string when no stored ID exists', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    const id = await getDistinctId();

    expect(id).toMatch(UUID_RE);
  });

  it('persists the generated UUID to secure store on first call', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    const id = await getDistinctId();

    expect(mockSetItemAsync).toHaveBeenCalledWith('posthog_distinct_id', id);
  });

  it('returns the stored UUID on subsequent calls without generating a new one', async () => {
    const storedId = '12345678-1234-4abc-8abc-123456789012';
    mockGetItemAsync.mockResolvedValue(storedId);

    const id = await getDistinctId();

    expect(id).toBe(storedId);
    expect(mockSetItemAsync).not.toHaveBeenCalled();
  });

  it('distinct ID is never the user auth.uid (it is always a random UUID)', async () => {
    // The contract: getDistinctId() generates its own UUID, never accepts an
    // external user ID.  Simulate an empty store — the result must be a fresh
    // UUID regardless of any hypothetical user state.
    mockGetItemAsync.mockResolvedValue(null);
    const fakeAuthUid = 'auth-user-uuid-deadbeef-0000';

    const id = await getDistinctId();

    expect(id).not.toBe(fakeAuthUid);
    expect(id).toMatch(UUID_RE);
  });
});

// ─── Tests: PostHog initialisation options ───────────────────────────────────

describe('PostHog client initialisation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the lazy singleton so the constructor is called fresh in each test.
    _resetClientForTesting();
    mockGetItemAsync.mockResolvedValue(null);
    mockSetItemAsync.mockResolvedValue(undefined);
  });

  it('initialises PostHog with the EU host', async () => {
    // Trigger lazy init via track.
    await track('app_opened');

    expect(jest.mocked(PostHog)).toHaveBeenCalledWith(
      'phk_test_key',
      expect.objectContaining({ host: 'https://eu.posthog.com' }),
    );
  });

  it('initialises PostHog with session replay disabled', async () => {
    await track('app_opened');

    expect(jest.mocked(PostHog)).toHaveBeenCalledWith(
      'phk_test_key',
      expect.objectContaining({ enableSessionReplay: false }),
    );
  });
});
