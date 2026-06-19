import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export function useIsModerator(): UseQueryResult<boolean, Error> {
  const userId = useAuthStore((s) => s.session?.user.id) ?? null;

  return useQuery<boolean, Error>({
    queryKey: ['moderation', 'is_moderator', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_moderator');
      if (error) throw new Error(error.message);
      return data === true;
    },
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
  });
}
