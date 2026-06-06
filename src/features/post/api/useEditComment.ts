import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface EditCommentInput {
  commentId: string;
  body: string;
}

export type EditCommentErrorKind = 'window_closed' | 'unknown';

export class EditCommentError extends Error {
  constructor(
    public readonly kind: EditCommentErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'EditCommentError';
  }
}

export function useEditComment(
  postId: string,
): UseMutationResult<void, EditCommentError, EditCommentInput> {
  const queryClient = useQueryClient();

  return useMutation<void, EditCommentError, EditCommentInput>({
    mutationFn: async ({ commentId, body }) => {
      const { data, error } = await supabase
        .from('comments')
        .update({ body })
        .eq('id', commentId)
        .select('id')
        .maybeSingle();

      if (error) {
        throw new EditCommentError('unknown', error.message);
      }
      // RLS blocked the UPDATE (15-min window expired or not the author)
      if (!data) {
        throw new EditCommentError('window_closed', 'Editing window has closed.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}
