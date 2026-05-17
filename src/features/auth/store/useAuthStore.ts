// CRITICAL-PATH: Auth store — session management, sign-up/sign-in, identifier onboarding.
// Needs human security review before production.

import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  onboarding_complete: boolean;
};

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  generateIdentifier(): Promise<void>;
  confirmIdentifier(): Promise<void>;
  initialize(): Promise<void>;
  clearError(): void;
}

type AuthStore = AuthState & AuthActions;

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error ?? !data) return null;

  // The DB schema doesn't have onboarding_complete yet — we derive it from
  // whether anonymous_identifier is set. This will be updated once the column
  // is added via migration.
  return {
    ...data,
    onboarding_complete: Boolean(data.anonymous_identifier),
  };
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  session: null,
  profile: null,
  isLoading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────────────────────
  clearError() {
    set({ error: null });
  },

  async signUp(email, password) {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      set({ isLoading: false });
      router.replace('/(auth)/verify' as Href);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },

  async signIn(email, password) {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      const profile = data.session ? await fetchProfile(data.session.user.id) : null;
      set({ session: data.session, profile, isLoading: false });
      if (profile?.onboarding_complete) {
        router.replace('/(main)' as Href);
      } else {
        router.replace('/(auth)/identifier' as Href);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },

  async signOut() {
    set({ isLoading: true, error: null });
    try {
      await supabase.auth.signOut();
      set({ session: null, profile: null, isLoading: false });
      router.replace('/(auth)' as Href);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },

  async generateIdentifier() {
    const { session } = get();
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.rpc('generate_identifier' as never);
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      const profile = await fetchProfile(session.user.id);
      set({ profile, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },

  async confirmIdentifier() {
    const { session } = get();
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() } as never)
        .eq('user_id', session.user.id);
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      const profile = await fetchProfile(session.user.id);
      set({
        profile: profile ? { ...profile, onboarding_complete: true } : null,
        isLoading: false,
      });
      router.replace('/(main)' as Href);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },

  async initialize() {
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const profile = session ? await fetchProfile(session.user.id) : null;
      set({ session, profile, isLoading: false });

      supabase.auth.onAuthStateChange(async (event, newSession) => {
        const currentProfile = newSession ? await fetchProfile(newSession.user.id) : null;
        set({ session: newSession, profile: currentProfile });

        if (event === 'SIGNED_IN' && newSession) {
          if (currentProfile?.onboarding_complete) {
            router.replace('/(main)' as Href);
          } else {
            router.replace('/(auth)/identifier' as Href);
          }
        } else if (event === 'SIGNED_OUT') {
          router.replace('/(auth)' as Href);
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },
}));
