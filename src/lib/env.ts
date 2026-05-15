export interface Env {
  supabaseUrl: string;
  supabaseAnonKey: string;
  sentryDsn: string;
  posthogKey: string;
}

export function getEnv(source: Partial<Record<string, string>> = process.env): Env {
  const supabaseUrl = source['EXPO_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = source['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
  const sentryDsn = source['EXPO_PUBLIC_SENTRY_DSN'];
  const posthogKey = source['EXPO_PUBLIC_POSTHOG_KEY'];

  if (!supabaseUrl)
    throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey)
    throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!sentryDsn)
    throw new Error('Missing required environment variable: EXPO_PUBLIC_SENTRY_DSN');
  if (!posthogKey)
    throw new Error('Missing required environment variable: EXPO_PUBLIC_POSTHOG_KEY');

  return { supabaseUrl, supabaseAnonKey, sentryDsn, posthogKey };
}
