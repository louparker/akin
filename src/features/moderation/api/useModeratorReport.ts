import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type ReportRow = Tables<'reports'>;

export interface ModeratorReportDetail extends ReportRow {
  reporterIdentifier: string | null;
  reportedIdentifier: string | null;
  targetStrikeCount: number;
}

interface TargetUserDetails {
  identifier: string | null;
  userId: string | null;
}

async function resolveTargetUserDetails(
  targetType: string,
  targetId: string,
): Promise<TargetUserDetails> {
  if (targetType === 'post') {
    const { data } = await supabase
      .from('posts')
      .select('author_id, author_identifier')
      .eq('id', targetId)
      .single();
    return { identifier: data?.author_identifier ?? null, userId: data?.author_id ?? null };
  }
  if (targetType === 'comment') {
    const { data } = await supabase
      .from('comments')
      .select('author_id, author_identifier')
      .eq('id', targetId)
      .single();
    return { identifier: data?.author_identifier ?? null, userId: data?.author_id ?? null };
  }
  if (targetType === 'user') {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, anonymous_identifier')
      .eq('user_id', targetId)
      .single();
    return {
      identifier: data?.anonymous_identifier ?? null,
      userId: data?.user_id ?? null,
    };
  }
  return { identifier: null, userId: null };
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

      const [reporterResult, targetDetails] = await Promise.all([
        supabase
          .from('profiles')
          .select('anonymous_identifier')
          .eq('user_id', report.reporter_id)
          .single(),
        resolveTargetUserDetails(report.target_type, report.target_id),
      ]);

      let targetStrikeCount = 0;
      if (targetDetails.userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('strike_count')
          .eq('user_id', targetDetails.userId)
          .single();
        targetStrikeCount = profile?.strike_count ?? 0;
      }

      return {
        ...report,
        reporterIdentifier: reporterResult.data?.anonymous_identifier ?? null,
        reportedIdentifier: targetDetails.identifier,
        targetStrikeCount,
      };
    },
    enabled: Boolean(reportId),
  });
}
