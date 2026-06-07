import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { track } from '@/lib/analytics';
import type { Enums } from '@/types/database';

const ERR_RATE_LIMIT = 'P0030';

export type ReportErrorKind = 'rate_limit' | 'unknown';

export class ReportError extends Error {
  constructor(
    public readonly kind: ReportErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ReportError';
  }
}

export interface ReportInput {
  target_id: string;
  target_type: Enums<'report_target'>;
  reason: Enums<'report_reason'>;
  notes?: string;
}

export function useReport(): UseMutationResult<void, ReportError, ReportInput> {
  const { session } = useAuthStore();

  return useMutation<void, ReportError, ReportInput>({
    mutationFn: async ({ target_id, target_type, reason, notes }) => {
      if (!session) {
        throw new ReportError('unknown', 'Not authenticated');
      }

      const { error } = await supabase.from('reports').insert({
        target_id,
        target_type,
        reason,
        reporter_id: session.user.id,
        ...(notes ? { notes } : {}),
      });

      if (error) {
        const code = (error as { code?: string }).code;
        if (code === ERR_RATE_LIMIT) {
          throw new ReportError('rate_limit', error.message);
        }
        throw new ReportError('unknown', error.message);
      }

      void track('report_filed', { reason });
    },
  });
}
