import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export interface CreateCommentInput {
  body: string;
}

// Postgres error codes raised by the participation-limit triggers
const ERR_POST_FULL = 'P0001';
const ERR_ACTIVE_LIMIT = 'P0003';

export type CreateCommentErrorKind = 'post_full' | 'active_limit' | 'network' | 'unknown';

export class CreateCommentError extends Error {
  constructor(
    public readonly kind: CreateCommentErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'CreateCommentError';
  }
}

export function useCreateComment(
  postId: string,
): UseMutationResult<void, CreateCommentError, CreateCommentInput> {
  const queryClient = useQueryClient();
  const { session, profile } = useAuthStore();

  return useMutation<void, CreateCommentError, CreateCommentInput>({
    mutationFn: async ({ body }) => {
      if (!session) {
        throw new CreateCommentError('unknown', 'Not authenticated');
      }

      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        body,
        author_id: session.user.id,
        author_identifier: profile?.anonymous_identifier ?? '',
      });

      if (error) {
        const code = (error as { code?: string }).code;
        if (code === ERR_POST_FULL) {
          throw new CreateCommentError('post_full', 'This conversation is full.');
        }
        if (code === ERR_ACTIVE_LIMIT) {
          throw new CreateCommentError('active_limit', 'Active post limit reached.');
        }
        if (error.message.toLowerCase().includes('network') || error.message.includes('fetch')) {
          throw new CreateCommentError('network', error.message);
        }
        throw new CreateCommentError('unknown', error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}
