import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type ReportRow = Tables<'reports'>;

export function useModeratorReport(reportId: string): UseQueryResult<ReportRow, Error> {
  return useQuery<ReportRow, Error>({
    queryKey: ['moderation', 'report', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Report not found');
      return data;
    },
    enabled: Boolean(reportId),
  });
}
