// CRITICAL-PATH: auth — pending expert review
// Session management, sign-up/sign-in, identifier onboarding, account deletion.

import { create } from 'zustand';
import type { Session, EmailOtpType } from '@supabase/supabase-js';
import { router } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useLocaleStore } from '@/features/locale/store/useLocaleStore';
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
  verifyEmailOtp(email: string, token: string): Promise<void>;
  confirmFromDeepLink(tokenHash: string, type: EmailOtpType): Promise<boolean>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
  generateIdentifier(options?: { force?: boolean }): Promise<void>;
  confirmIdentifier(): Promise<void>;
  completeOnboarding(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  deleteAccount(password: string): Promise<void>;
  initialize(): Promise<void>;
  clearError(): void;
}

type AuthStore = AuthState & AuthActions;

/**
 * The single source of truth for "is this suspension still in effect."
 * Must match the boot guard in app/_layout.tsx — see Profile.status / .suspended_until.
 */
function isSuspensionActive(suspendedUntil: string | null): boolean {
  if (!suspendedUntil) return false;
  return new Date(suspendedUntil) > new Date();
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error ?? !data) return null;
  return data;
}

/**
 * On first auth resolve after install (or after a `Clear Data` wipe),
 * the local locale store still holds its default 'system' value. If the
 * profile carries an explicit language ('sv' or 'en') from a previous
 * session on another device, honour it so the user doesn't get bounced
 * back to device locale on every fresh install.
 *
 * Only seeds when the local store is still at default — never overrides
 * an explicit local choice (including 'system' that the user picked).
 *
 * Distinguishing "default 'system'" from "user explicitly chose 'system'"
 * is impossible client-side without an extra flag; v1 accepts the tradeoff
 * that a user who explicitly picks 'system' on device A and then signs in
 * on device B may see device B's locale (acceptable: 'system' literally
 * means "follow this device").
 */
function seedLocaleFromProfile(profile: Profile | null) {
  if (!profile) return;
  const lang = profile.language;
  if (lang !== 'sv' && lang !== 'en') return;
  const localeStore = useLocaleStore.getState();
  if (localeStore.preference === 'system') {
    localeStore.setPreference(lang);
  }
}

function routeAfterSignIn(profile: Profile | null) {
  if (!profile) {
    router.replace('/(auth)/identifier');
    return;
  }
  if (profile.status === 'banned') {
    // Root layout renders <BannedScreen /> whenever profile.status === 'banned',
    // replacing <Slot /> entirely. No navigation needed — the store update alone
    // triggers the correct render. Navigating would race with the re-render and
    // could land on the identifier screen if the profile fetch is delayed.
    return;
  }
  if (profile.status === 'suspended' && isSuspensionActive(profile.suspended_until)) {
    // CRITICAL-PATH: same pattern as banned above — the root layout in
    // app/_layout.tsx swaps <Slot /> for <SuspendedScreen /> when the profile
    // is suspended AND the timestamp is still in the future. router.replace
    // would race with that swap and bounce the user to /(auth). Just return.
    //
    // If the timestamp has lapsed, fall through so the user routes normally
    // (to feed/onboarding). profiles.status will remain 'suspended' on the row
    // until a cleanup job clears it — see follow-up pg_cron task.
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

  // Code-entry confirmation: the user types the OTP from the email.
  // verifyOtp confirms the address and returns a session in one step.
  async verifyEmailOtp(email, token) {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      const profile = data.session ? await fetchProfile(data.session.user.id) : null;
      set({ session: data.session, profile, isLoading: false });
      routeAfterSignIn(profile);
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: 'verifyEmailOtp',
      });
      set({ error: 'Unknown error', isLoading: false });
    }
  },

  // Deep-link confirmation: the email's "Confirm" button opens akin://confirm
  // carrying the single-use token_hash. Returns true on success so the confirm
  // screen can show an error state without a thrown exception.
  async confirmFromDeepLink(tokenHash, type) {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }
      const profile = data.session ? await fetchProfile(data.session.user.id) : null;
      set({ session: data.session, profile, isLoading: false });

      // Recovery links land the user on the password form with a live session;
      // everything else (signup/email change) follows the normal post-sign-in route.
      if (type === 'recovery') {
        router.replace('/(auth)/reset-confirm');
      } else {
        routeAfterSignIn(profile);
      }
      return true;
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: 'confirmFromDeepLink',
      });
      set({ error: 'Unknown error', isLoading: false });
      return false;
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

      // Zombie-session guard: JWT is valid but profile is unreadable (e.g. RLS
      // timing issue, or profile row was wiped). Sign out rather than routing
      // to /(auth)/identifier which would start the new-user onboarding flow.
      if (data.session && !profile) {
        await supabase.auth.signOut();
        set({
          session: null,
          profile: null,
          error: 'Account not found. Please try again.',
          isLoading: false,
        });
        return;
      }

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

  // Re-fetch the profile from the server. Used after writes that mutate
  // server-side profile state via triggers (e.g. active_post_count on post
  // creation), since the local store would otherwise show a stale value.
  async refreshProfile() {
    const { session } = get();
    if (!session) return;
    const profile = await fetchProfile(session.user.id);
    if (profile) set({ profile });
  },

  async generateIdentifier(options) {
    const { session } = get();
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      // Only attach `force` when explicitly requested (the "Try another name"
      // button). Leaving it out for the polling path keeps the call body
      // backwards-compatible with the existing edge-function idempotency check.
      const body: { userId: string; force?: boolean } = { userId: session.user.id };
      if (options?.force) body.force = true;

      const invokeResult = await supabase.functions.invoke<unknown>('generate-identifier', {
        body,
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

      // Zombie-session guard: if we have a session but no profile, the auth.users
      // row exists but the profiles row was wiped (e.g. local db:reset while the
      // Keychain refresh token survived). Force a sign-out so the user lands on
      // welcome instead of a half-broken main screen with empty identifier and
      // failing RLS-gated writes. Per CLAUDE.md §2, anonymity + correctness rely
      // on profile being the source of truth for who the user is in public reads.
      if (session && !profile) {
        await supabase.auth.signOut();
        set({ session: null, profile: null, isLoading: false });
        router.replace('/(auth)');
        return;
      }

      set({ session, profile, isLoading: false });
      seedLocaleFromProfile(profile);

      supabase.auth.onAuthStateChange(async (event, newSession) => {
        const currentProfile = newSession ? await fetchProfile(newSession.user.id) : null;

        // Same zombie guard for live auth changes (e.g. SIGNED_IN after refresh
        // with a stale session). Sign out and route to welcome.
        if (newSession && !currentProfile && event !== 'SIGNED_OUT') {
          await supabase.auth.signOut();
          set({ session: null, profile: null });
          router.replace('/(auth)');
          return;
        }

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
        if (event === 'SIGNED_IN') seedLocaleFromProfile(currentProfile);

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
