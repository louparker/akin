import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const ERR_FORBIDDEN = 'P0401';
const ERR_NOT_FOUND = 'P0404';
const ERR_INVALID_ACTION = 'P0400';

export type ModerationAction = 'dismiss' | 'hide' | 'warn' | 'suspend' | 'ban' | 'csam';

export type ModerateReportErrorKind =
  | 'no_reason'
  | 'forbidden'
  | 'not_found'
  | 'invalid_action'
  | 'unknown';

export class ModerateReportError extends Error {
  constructor(
    public readonly kind: ModerateReportErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ModerateReportError';
  }
}

export interface ModerateReportInput {
  reportId: string;
  action: ModerationAction;
  reason: string;
}

export function useModerateReport(): UseMutationResult<
  void,
  ModerateReportError,
  ModerateReportInput
> {
  const queryClient = useQueryClient();

  return useMutation<void, ModerateReportError, ModerateReportInput>({
    mutationFn: async ({ reportId, action, reason }) => {
      if (!reason.trim()) {
        throw new ModerateReportError('no_reason', 'Reason is required.');
      }

      // moderate_report was added in migration 0020; run `supabase gen types` after applying
      // migration to remove this cast.
      type ModerateRpc = { error: { code?: string; message: string } | null };
      const { error } = await (
        supabase as unknown as {
          rpc: (fn: string, args: Record<string, string>) => Promise<ModerateRpc>;
        }
      ).rpc('moderate_report', {
        p_report_id: reportId,
        p_action: action,
        p_reason: reason.trim(),
      });

      if (error) {
        const code = (error as { code?: string }).code;
        if (code === ERR_FORBIDDEN) {
          throw new ModerateReportError('forbidden', error.message);
        }
        if (code === ERR_NOT_FOUND) {
          throw new ModerateReportError('not_found', error.message);
        }
        if (code === ERR_INVALID_ACTION) {
          throw new ModerateReportError('invalid_action', error.message);
        }
        throw new ModerateReportError('unknown', error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moderation', 'queue'] });
      void queryClient.invalidateQueries({ queryKey: ['moderation', 'audit'] });
    },
  });
}
