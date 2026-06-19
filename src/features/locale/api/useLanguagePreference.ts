// Settings → Language toggle backing hook.
//
// Reads the current preference from useLocaleStore. Writing 'sv' / 'en' updates
// the store AND mirrors to profiles.language so the explicit choice survives a
// device reinstall via cross-device login. Writing 'system' updates the store
// only — profiles.language retains the last explicit choice as a fallback.

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { logger } from '@/lib/logger';
import { useLocaleStore, type LocalePreference } from '../store/useLocaleStore';

export interface UseLanguagePreferenceResult {
  preference: LocalePreference;
  setPreference: (preference: LocalePreference) => Promise<void>;
  isPending: boolean;
}

export function useLanguagePreference(): UseLanguagePreferenceResult {
  const preference = useLocaleStore((s) => s.preference);

  const mutation = useMutation({
    mutationFn: async (next: LocalePreference) => {
      useLocaleStore.getState().setPreference(next);

      if (next === 'system') return;

      const { session } = useAuthStore.getState();
      if (!session) return;

      const { error } = await supabase
        .from('profiles')
        .update({ language: next })
        .eq('user_id', session.user.id);

      if (error) {
        logger.error(new Error(error.message), { action: 'setLanguagePreference', next });
      }
    },
  });

  return {
    preference,
    setPreference: async (next) => {
      await mutation.mutateAsync(next);
    },
    isPending: mutation.isPending,
  };
}
