import { getEnv } from '@/lib/env';

const REQUIRED_KEYS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'] as const;

const validEnv: Record<string, string> = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  EXPO_PUBLIC_SENTRY_DSN: 'https://x@sentry.io/1',
  EXPO_PUBLIC_POSTHOG_KEY: 'phk_test',
};

describe('getEnv', () => {
  it('returns all values when every key is present', () => {
    const env = getEnv(validEnv);
    expect(env.supabaseUrl).toBe('https://abc.supabase.co');
    expect(env.supabaseAnonKey).toBe('anon-key');
    expect(env.sentryDsn).toBe('https://x@sentry.io/1');
    expect(env.posthogKey).toBe('phk_test');
  });

  it.each(REQUIRED_KEYS)('throws when %s is missing', (key) => {
    const incomplete = { ...validEnv, [key]: '' };
    expect(() => getEnv(incomplete)).toThrow(key);
  });

  it('throws when a required key is undefined', () => {
    const { EXPO_PUBLIC_SUPABASE_URL: _omit, ...rest } = validEnv;
    expect(() => getEnv(rest)).toThrow('EXPO_PUBLIC_SUPABASE_URL');
  });

  it('returns undefined for sentryDsn when key is absent', () => {
    const env = getEnv({ ...validEnv, EXPO_PUBLIC_SENTRY_DSN: '' });
    expect(env.sentryDsn).toBeUndefined();
  });

  it('returns undefined for posthogKey when key is absent', () => {
    const env = getEnv({ ...validEnv, EXPO_PUBLIC_POSTHOG_KEY: '' });
    expect(env.posthogKey).toBeUndefined();
  });
});
