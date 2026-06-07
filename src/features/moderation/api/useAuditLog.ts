import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AuditEntry {
  id: number;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
}

const PAGE_SIZE = 50;

export function useAuditLog({ page }: { page: number }): UseQueryResult<AuditPage, Error> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  return useQuery<AuditPage, Error>({
    queryKey: ['moderation', 'audit', page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);
      return {
        entries: (data ?? []) as AuditEntry[],
        total: count ?? 0,
      };
    },
  });
}
