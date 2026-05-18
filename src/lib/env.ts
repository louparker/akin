export interface Env {
  supabaseUrl: string;
  supabaseAnonKey: string;
  sentryDsn: string | undefined;
  posthogKey: string | undefined;
}

export function getEnv(source: Partial<Record<string, string>> = process.env): Env {
  const supabaseUrl = source['EXPO_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = source['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
  const sentryDsn = source['EXPO_PUBLIC_SENTRY_DSN'] || undefined;
  const posthogKey = source['EXPO_PUBLIC_POSTHOG_KEY'] || undefined;

  if (!supabaseUrl)
    throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey)
    throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_ANON_KEY');

  return { supabaseUrl, supabaseAnonKey, sentryDsn, posthogKey };
}
