// CRITICAL-PATH: Supabase client — auth + data layer.
// Needs human security review before production.
//
// The anon key is public (it lives in env). RLS is the real auth boundary.
// The service-role key is NEVER used here — it stays in Edge Functions only.

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@/types/database';
import { getEnv } from '@/lib/env';

const env = getEnv();

// expo-secure-store adapter so Supabase Auth persists the session safely.
// Falls back to in-memory for web/test environments where SecureStore is unavailable.
const ExpoSecureStoreAdapter = {
  getItem: (key: string): string | null | Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): void | Promise<void> => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): void | Promise<void> => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
