import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export interface RemoveParticipantInput {
  postId: string;
  removedUserId: string;
}

export type RemoveParticipantErrorKind = 'forbidden' | 'not_participant' | 'network' | 'unknown';

export class RemoveParticipantError extends Error {
  constructor(
    public readonly kind: RemoveParticipantErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'RemoveParticipantError';
  }
}

/**
 * OP-only mutation: removes a single commenter from a post.
 *
 * Server-side guarantees (see migration 0017):
 *  - Only the OP can insert into post_participant_removals (RLS).
 *  - OP cannot remove themselves (CHECK constraint).
 *  - Target must be a current participant.
 *  - Side effects (participant_count decrement, comments marked removed_by_op,
 *    audit log entry) happen inside a SECURITY DEFINER trigger.
 *
 * Client only fires the INSERT and invalidates the post query on success.
 * Optimistic update is deliberately not used here: the operation is rare,
 * is irreversible in v1, and we want the source-of-truth refetch to reflect
 * the cascading server-side updates (comments[].removed_by_op, capacity).
 */
export function useRemoveParticipant(): UseMutationResult<
  void,
  RemoveParticipantError,
  RemoveParticipantInput
> {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation<void, RemoveParticipantError, RemoveParticipantInput>({
    mutationFn: async ({ postId, removedUserId }) => {
      if (!session) {
        throw new RemoveParticipantError('unknown', 'Not authenticated');
      }

      const { error } = await supabase.from('post_participant_removals').insert({
        post_id: postId,
        removed_user_id: removedUserId,
        removed_by: session.user.id,
      });

      if (error) {
        // RLS denial surfaces as a generic 42501 / "new row violates row-level security"
        const message = error.message ?? '';
        if (
          (error as { code?: string }).code === '42501' ||
          message.toLowerCase().includes('row-level security')
        ) {
          throw new RemoveParticipantError(
            'forbidden',
            'Only the post author can remove a participant.',
          );
        }
        if (message.toLowerCase().includes('network') || message.includes('fetch')) {
          throw new RemoveParticipantError('network', message);
        }
        throw new RemoveParticipantError('unknown', message);
      }
    },
    onSuccess: (_data, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
