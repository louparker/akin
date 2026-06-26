import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export interface BlockInput {
  blocked_id: string;
  blocked_identifier: string;
  postId?: string;
}

export function useBlock(): UseMutationResult<void, Error, BlockInput> {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation<void, Error, BlockInput>({
    mutationFn: async ({ blocked_id, blocked_identifier }) => {
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.from('blocks').insert({
        blocker_id: session.user.id,
        blocked_id,
        blocked_identifier,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: (_data, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (postId) {
        void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      }
    },
  });
}
