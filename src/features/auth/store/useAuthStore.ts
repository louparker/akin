// CRITICAL-PATH: auth — pending expert review
// Session management, sign-up/sign-in, identifier onboarding, account deletion.

import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  onboarded_at: string | null;
  deleted_at: string | null;
};

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  signUp(email: string, password: string, language?: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  generateIdentifier(): Promise<void>;
  confirmIdentifier(): Promise<void>;
  completeOnboarding(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  deleteAccount(password: string): Promise<void>;
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
  return data;
}

function routeAfterSignIn(profile: Profile | null) {
  if (!profile) {
    router.replace('/(auth)/identifier');
    return;
  }
  if (profile.status === 'banned') {
    // Root layout shows BannedScreen — just go to main and let it intercept.
    router.replace('/(main)/feed');
    return;
  }
  if (profile.status === 'suspended') {
    router.replace('/(main)/suspended');
    return;
  }
  if (!profile.onboarded_at) {
    // Has identifier? Go to onboarding. Otherwise go to identifier reveal.
    if (profile.anonymous_identifier && !profile.anonymous_identifier.startsWith('pending_')) {
      router.replace('/(auth)/onboarding');
    } else {
      router.replace('/(auth)/identifier');
    }
    return;
  }
  router.replace('/(main)/feed');
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // ── State ─────────────────────────────────────────────────────────────────
  session: null,
  profile: null,
  isLoading: false,
  error: null,

  // ── Actions ───────────────────────────────────────────────────────────────
  clearError() {
    set({ error: null });
  },

  async signUp(email, password, language = 'en') {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            language,
            age_verified_at: new Date().toISOString(),
          },
        },
      });
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      set({ isLoading: false });
      router.replace({ pathname: '/(auth)/verify', params: { email } });
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), { action: 'signUp' });
      set({ error: 'Unknown error', isLoading: false });
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
      routeAfterSignIn(profile);
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), { action: 'signIn' });
      set({ error: 'Unknown error', isLoading: false });
    }
  },

  async signOut() {
    set({ isLoading: true, error: null });
    try {
      await supabase.auth.signOut();
      set({ session: null, profile: null, isLoading: false });
      router.replace('/(auth)');
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), { action: 'signOut' });
      set({ error: 'Unknown error', isLoading: false });
    }
  },

  async generateIdentifier() {
    const { session } = get();
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const invokeResult = await supabase.functions.invoke<unknown>('generate-identifier', {
        body: { userId: session.user.id },
      });
      if (invokeResult.error) {
        const msg =
          invokeResult.error instanceof Error ? invokeResult.error.message : 'Unknown error';
        set({ error: msg, isLoading: false });
        return;
      }
      const profile = await fetchProfile(session.user.id);
      set({ profile, isLoading: false });
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: 'generateIdentifier',
      });
      set({ error: 'Unknown error', isLoading: false });
    }
  },

  async confirmIdentifier() {
    const { session } = get();
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const profile = await fetchProfile(session.user.id);
      set({ profile, isLoading: false });
      // Go to onboarding — not the feed yet.
      router.replace('/(auth)/onboarding');
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: 'confirmIdentifier',
      });
      set({ error: 'Unknown error', isLoading: false });
    }
  },

  async completeOnboarding() {
    const { session } = get();
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({ onboarded_at: now })
        .eq('user_id', session.user.id);
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      const profile = await fetchProfile(session.user.id);
      set({ profile, isLoading: false });
      router.replace('/(main)/feed');
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: 'completeOnboarding',
      });
      set({ error: 'Unknown error', isLoading: false });
    }
  },

  async requestPasswordReset(email) {
    set({ isLoading: true, error: null });
    try {
      // Always generic response — never confirm whether an email exists.
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'akin://reset-confirm',
      });
      set({ isLoading: false });
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: 'requestPasswordReset',
      });
      set({ isLoading: false });
    }
  },

  async updatePassword(newPassword) {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      set({ isLoading: false });
      router.replace('/(main)/feed');
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: 'updatePassword',
      });
      set({ error: 'Unknown error', isLoading: false });
    }
  },

  async deleteAccount(password) {
    const { session } = get();
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      // Re-authenticate to verify the password before deletion.
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user.email;
      if (!email) {
        set({ error: 'No session', isLoading: false });
        return;
      }
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        set({ error: authError.message, isLoading: false });
        return;
      }
      // Soft-delete: set status + deleted_at. Content (posts/comments) soft-deleted via trigger.
      const now = new Date().toISOString();
      const { error: deleteError } = await supabase
        .from('profiles')
        .update({ status: 'deleted', deleted_at: now } as never)
        .eq('user_id', session.user.id);
      if (deleteError) {
        set({ error: deleteError.message, isLoading: false });
        return;
      }
      await supabase.auth.signOut();
      set({ session: null, profile: null, isLoading: false });
      router.replace({ pathname: '/(auth)', params: { deleted: '1' } });
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: 'deleteAccount',
      });
      set({ error: 'Unknown error', isLoading: false });
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

        // Guard against stale-fetch race: if completeOnboarding() ran while fetchProfile
        // was in-flight, the store already has the authoritative profile (with onboarded_at).
        // Overwriting it with stale data would cause routeAfterSignIn to send the user back
        // to onboarding even though they just reached the feed.
        const storeProfile = get().profile;
        if (storeProfile?.onboarded_at && currentProfile && !currentProfile.onboarded_at) {
          set({ session: newSession });
          return;
        }

        set({ session: newSession, profile: currentProfile });

        if (event === 'SIGNED_IN' && newSession) {
          routeAfterSignIn(currentProfile);
        } else if (event === 'SIGNED_OUT') {
          router.replace('/(auth)');
        }
      });
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), { action: 'initialize' });
      set({ error: 'Unknown error', isLoading: false });
    }
  },
}));
