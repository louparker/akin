import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
    },
  });
}
