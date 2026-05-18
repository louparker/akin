import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { flagDefaults, isFlagKey, type FlagKey } from '../defaults';
import { useFlagsStore } from '../store/useFlagsStore';

const FLAGS_TIMEOUT_MS = 5_000;
const FLAGS_POLL_MS = 60_000;

async function fetchFlags(): Promise<Record<FlagKey, boolean>> {
  const fetchPromise = supabase
    .from('feature_flags')
    .select('key, value')
    .then(({ data, error }) => {
      if (error) throw error;

      const map: Partial<Record<FlagKey, boolean>> = {};
      for (const row of data ?? []) {
        if (isFlagKey(row.key)) {
          // eslint-disable-next-line security/detect-object-injection -- key is validated by isFlagKey
          map[row.key] = row.value;
        }
      }
      return { ...flagDefaults, ...map };
    });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Feature flags fetch timed out after 5s')), FLAGS_TIMEOUT_MS),
  );

  return Promise.race([fetchPromise, timeoutPromise]);
}

export function useFeatureFlags() {
  const setFlags = useFlagsStore((state) => state.setFlags);

  const query = useQuery({
    queryKey: ['feature_flags'],
    queryFn: fetchFlags,
    staleTime: FLAGS_POLL_MS,
    refetchInterval: FLAGS_POLL_MS,
    // Never throw to the error boundary — flag fetch failures are silent.
    throwOnError: false,
    retry: false,
  });

  useEffect(() => {
    if (query.isError) {
      logger.error('feature_flags_fetch_failed', { reason: String(query.error) });
    }
  }, [query.isError, query.error]);

  useEffect(() => {
    if (query.data) {
      setFlags(query.data);
    }
  }, [query.data, setFlags]);

  return query;
}

export function useFlag(key: FlagKey): boolean {
  return useFlagsStore((state) => {
    // eslint-disable-next-line security/detect-object-injection -- key is FlagKey union; no user input
    return state.flags[key] ?? flagDefaults[key];
  });
}
