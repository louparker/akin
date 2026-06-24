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
        const code = (error as { code?: string }).code;
        // The edit-window guard (0025) raises P0021 once 15 minutes have passed.
        if (code === 'P0021') {
          throw new EditCommentError('window_closed', error.message);
        }
        throw new EditCommentError('unknown', error.message);
      }
      // No row returned means RLS blocked it (not the author).
      if (!data) {
        throw new EditCommentError('window_closed', 'Editing window has closed.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}
