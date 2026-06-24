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

      // Upsert on the (post_id, user_id) primary key so a change of mind updates
      // the existing vote instead of failing with a duplicate-key error. The
      // maintain_spice_averages trigger handles the INSERT and UPDATE paths, and
      // RLS allows both ("users vote on others posts" + "users update own spice vote").
      const { error } = await supabase.from('spice_votes').upsert(
        {
          post_id: postId,
          score: level,
          user_id: session.user.id,
        },
        { onConflict: 'post_id,user_id' },
      );

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      // average_spice_level is denormalised on the post, so the feed cards that
      // render the flames are now stale too.
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
