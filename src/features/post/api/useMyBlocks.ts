import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export interface BlockRow {
  blocked_id: string;
  blocked_identifier: string;
  created_at: string;
}

export function useMyBlocks(): UseQueryResult<BlockRow[]> {
  const session = useAuthStore((s) => s.session);

  return useQuery<BlockRow[]>({
    queryKey: ['my-blocks', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('blocks')
        .select('blocked_id, blocked_identifier, created_at')
        .order('created_at', { ascending: false })
        .eq('blocker_id', session.user.id);

      if (error) throw new Error(error.message);
      return data;
    },
  });
}
