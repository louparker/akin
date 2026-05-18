export interface Env {
  supabaseUrl: string;
  supabaseAnonKey: string;
  // Optional in development — Sentry and PostHog no-op when their key is empty.
  // Required for production builds (enforced at EAS Build time, not at runtime).
  sentryDsn: string;
  posthogKey: string;
}

export function getEnv(source: Partial<Record<string, string>> = process.env): Env {
  const supabaseUrl = source['EXPO_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = source['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
  const sentryDsn = source['EXPO_PUBLIC_SENTRY_DSN'] ?? '';
  const posthogKey = source['EXPO_PUBLIC_POSTHOG_KEY'] ?? '';

  if (!supabaseUrl)
    throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey)
    throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_ANON_KEY');

  return { supabaseUrl, supabaseAnonKey, sentryDsn, posthogKey };
}
