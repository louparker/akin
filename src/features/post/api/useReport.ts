import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { Enums } from '@/types/database';

export interface ReportInput {
  target_id: string;
  target_type: Enums<'report_target'>;
  reason: Enums<'report_reason'>;
}

export function useReport(): UseMutationResult<void, Error, ReportInput> {
  const { session } = useAuthStore();

  return useMutation<void, Error, ReportInput>({
    mutationFn: async ({ target_id, target_type, reason }) => {
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.from('reports').insert({
        target_id,
        target_type,
        reason,
        reporter_id: session.user.id,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
  });
}
