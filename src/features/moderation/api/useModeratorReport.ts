import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type ReportRow = Tables<'reports'>;

export interface ModeratorReportDetail extends ReportRow {
  reporterIdentifier: string | null;
  reportedIdentifier: string | null;
}

async function resolveReportedIdentifier(
  targetType: string,
  targetId: string,
): Promise<string | null> {
  if (targetType === 'post') {
    const { data } = await supabase
      .from('posts')
      .select('author_identifier')
      .eq('id', targetId)
      .single();
    return data?.author_identifier ?? null;
  }
  if (targetType === 'comment') {
    const { data } = await supabase
      .from('comments')
      .select('author_identifier')
      .eq('id', targetId)
      .single();
    return data?.author_identifier ?? null;
  }
  if (targetType === 'user') {
    const { data } = await supabase
      .from('profiles')
      .select('anonymous_identifier')
      .eq('user_id', targetId)
      .single();
    return data?.anonymous_identifier ?? null;
  }
  return null;
}

export function useModeratorReport(reportId: string): UseQueryResult<ModeratorReportDetail, Error> {
  return useQuery<ModeratorReportDetail, Error>({
    queryKey: ['moderation', 'report', reportId],
    queryFn: async () => {
      const { data: report, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();
      if (error) throw new Error(error.message);
      if (!report) throw new Error('Report not found');

      const [reporterResult, reportedIdentifier] = await Promise.all([
        supabase
          .from('profiles')
          .select('anonymous_identifier')
          .eq('user_id', report.reporter_id)
          .single(),
        resolveReportedIdentifier(report.target_type, report.target_id),
      ]);

      return {
        ...report,
        reporterIdentifier: reporterResult.data?.anonymous_identifier ?? null,
        reportedIdentifier,
      };
    },
    enabled: Boolean(reportId),
  });
}
