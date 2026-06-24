import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export interface DeleteCommentInput {
  commentId: string;
}

export function useDeleteComment(
  postId: string,
): UseMutationResult<void, Error, DeleteCommentInput> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteCommentInput>({
    mutationFn: async ({ commentId }) => {
      const { data, error } = await supabase
        .from('comments')
        .update({ status: 'deleted' })
        .eq('id', commentId)
        .select('id')
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error('Could not delete comment — window may have closed.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      // Deleting your last comment on a not-full post frees your active slot
      // server-side (migration 0028). Refresh the profile so the
      // active-conversations count reflects it without a manual reload.
      void useAuthStore.getState().refreshProfile();
    },
  });
}
