import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useIsModerator(): UseQueryResult<boolean, Error> {
  return useQuery<boolean, Error>({
    queryKey: ['moderation', 'is_moderator'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_moderator');
      if (error) throw new Error(error.message);
      return data === true;
    },
    staleTime: 5 * 60 * 1000,
  });
}
