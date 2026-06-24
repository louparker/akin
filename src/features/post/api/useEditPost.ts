import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface EditPostInput {
  title: string;
  body: string;
}

export type EditPostErrorKind = 'window_closed' | 'unknown';

export class EditPostError extends Error {
  constructor(
    public readonly kind: EditPostErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'EditPostError';
  }
}

// Edits are restricted to the 15-minute window, enforced server-side by the
// enforce_post_update_columns trigger (raises P0021 once the window closes).
export function useEditPost(postId: string): UseMutationResult<void, EditPostError, EditPostInput> {
  const queryClient = useQueryClient();

  return useMutation<void, EditPostError, EditPostInput>({
    mutationFn: async ({ title, body }) => {
      const { data, error } = await supabase
        .from('posts')
        .update({ title, body })
        .eq('id', postId)
        .select('id')
        .maybeSingle();

      if (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P0021') {
          throw new EditPostError('window_closed', error.message);
        }
        throw new EditPostError('unknown', error.message);
      }
      // No row returned means RLS blocked it (not the author).
      if (!data) {
        throw new EditPostError('window_closed', 'Editing window has closed.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      // Title/excerpt on the feed card are stale after an edit.
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
