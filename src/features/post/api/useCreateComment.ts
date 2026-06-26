import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { track } from '@/lib/analytics';
import { logger } from '@/lib/logger';

// Postgres error codes raised by triggers
const ERR_POST_FULL = 'P0001';
const ERR_ACTIVE_LIMIT = 'P0003';
const ERR_REMOVED_FROM_POST = 'P0004';
const ERR_CONTENT_FILTER = 'P0010';
const ERR_CONTACT_INFO = 'P0011';

export type CreateCommentErrorKind =
  | 'post_full'
  | 'active_limit'
  | 'removed_from_post'
  | 'content_filter'
  | 'contact_info'
  | 'network'
  | 'unknown';

export class CreateCommentError extends Error {
  constructor(
    public readonly kind: CreateCommentErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'CreateCommentError';
  }
}

export interface CreateCommentInput {
  body: string;
}

export function useCreateComment(
  postId: string,
): UseMutationResult<string | null, CreateCommentError, CreateCommentInput> {
  const queryClient = useQueryClient();
  const { session, profile } = useAuthStore();

  return useMutation<string | null, CreateCommentError, CreateCommentInput>({
    mutationFn: async ({ body }) => {
      if (!session) {
        throw new CreateCommentError('unknown', 'Not authenticated');
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          body,
          author_id: session.user.id,
          author_identifier: profile?.anonymous_identifier ?? '',
        })
        .select('id')
        .single();

      if (error) {
        const code = (error as { code?: string }).code;
        if (code === ERR_POST_FULL) {
          throw new CreateCommentError('post_full', 'This conversation is full.');
        }
        if (code === ERR_ACTIVE_LIMIT) {
          throw new CreateCommentError('active_limit', 'Active post limit reached.');
        }
        if (code === ERR_REMOVED_FROM_POST) {
          throw new CreateCommentError(
            'removed_from_post',
            'You were removed from this conversation.',
          );
        }
        if (code === ERR_CONTENT_FILTER) {
          void track('content_filter_blocked', { rule_type: 'slur' });
          throw new CreateCommentError('content_filter', error.message);
        }
        if (code === ERR_CONTACT_INFO) {
          void track('content_filter_blocked', { rule_type: 'contact_info' });
          throw new CreateCommentError('contact_info', error.message);
        }
        if (error.message.toLowerCase().includes('network') || error.message.includes('fetch')) {
          throw new CreateCommentError('network', error.message);
        }
        throw new CreateCommentError('unknown', error.message);
      }

      return data?.id ?? null;
    },
    onSuccess: (commentId) => {
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      // The post's comment_count changed, so the feed card is now stale.
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      // Mirror the post-create flow: the active-conversations count is updated
      // server-side by the participation trigger, so pull the fresh profile
      // rather than waiting for a manual refresh.
      void useAuthStore.getState().refreshProfile();

      if (commentId) {
        void supabase.functions
          .invoke('notify-comment', { body: { commentId } })
          .then(({ error }) => {
            if (error) {
              logger.warn('notify-comment invocation failed', { action: 'comment_created' });
            }
          });
      }
    },
  });
}
