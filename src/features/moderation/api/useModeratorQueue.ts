import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

export type ReportRow = Tables<'reports'>;

// High-severity reasons that surface first in the queue.
export const HIGH_SEVERITY_REASONS: Enums<'report_reason'>[] = [
  'sexual',
  'threat',
  'hate',
  'harassment',
];

interface UseModeratorQueueOptions {
  reasonFilter?: Enums<'report_reason'> | null;
}

export function useModeratorQueue(
  options: UseModeratorQueueOptions = {},
): UseQueryResult<ReportRow[], Error> {
  const { reasonFilter } = options;

  return useQuery<ReportRow[], Error>({
    queryKey: ['moderation', 'queue', reasonFilter ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('reports').select('*').eq('status', 'open');

      if (reasonFilter) {
        query = query.in('reason', [reasonFilter]);
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}
