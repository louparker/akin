import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { PostWithComments } from './usePost';

export interface VoteSpiceInput {
  level: number;
}

export type VoteSpiceErrorKind = 'participant_required' | 'unknown';

export class VoteSpiceError extends Error {
  constructor(
    public readonly kind: VoteSpiceErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'VoteSpiceError';
  }
}

function roundAverage(total: number, count: number): number | null {
  if (count <= 0) return null;
  return Math.round((total / count) * 100) / 100;
}

function isParticipantRequiredError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42501' ||
    error.message?.toLowerCase().includes('row-level security policy') === true
  );
}

export function useVoteSpice(
  postId: string,
): UseMutationResult<void, VoteSpiceError, VoteSpiceInput> {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation<void, VoteSpiceError, VoteSpiceInput>({
    mutationFn: async ({ level }) => {
      if (!session) {
        throw new VoteSpiceError('unknown', 'Not authenticated');
      }

      // Upsert on the (post_id, user_id) primary key so a change of mind updates
      // the existing vote instead of failing with a duplicate-key error. The
      // maintain_spice_averages trigger handles the INSERT and UPDATE paths, and
      // RLS allows active post participants to set or change their own vote.
      const { error } = await supabase.from('spice_votes').upsert(
        {
          post_id: postId,
          score: level,
          user_id: session.user.id,
        },
        { onConflict: 'post_id,user_id' },
      );

      if (error) {
        if (isParticipantRequiredError(error)) {
          throw new VoteSpiceError('participant_required', error.message);
        }
        throw new VoteSpiceError('unknown', error.message);
      }
    },
    onSuccess: (_, { level }) => {
      queryClient.setQueryData<PostWithComments>(['post', postId], (old) => {
        if (!old) return old;

        const previousVote = old.userSpiceVote;
        const nextVoteCount =
          previousVote === null ? old.spice_vote_count + 1 : old.spice_vote_count;
        const nextTotal =
          previousVote === null
            ? old.total_spice_score + level
            : old.total_spice_score - previousVote + level;

        return {
          ...old,
          userSpiceVote: level,
          spice_vote_count: nextVoteCount,
          total_spice_score: nextTotal,
          average_spice_level: roundAverage(nextTotal, nextVoteCount),
        };
      });
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      // average_spice_level is denormalised on the post, so the feed cards that
      // render the flames are now stale too.
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
