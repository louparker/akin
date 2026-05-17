import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export interface VoteSpiceInput {
  level: number;
}

export function useVoteSpice(postId: string): UseMutationResult<void, Error, VoteSpiceInput> {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation<void, Error, VoteSpiceInput>({
    mutationFn: async ({ level }) => {
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.from('spice_votes').insert({
        post_id: postId,
        score: level,
        user_id: session.user.id,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}
