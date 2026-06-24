import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

// Soft-delete (status active→deleted). Allowed at any time — the row is retained
// for moderation. Enforced server-side by RLS (ownership) + the update-column trigger.
export function useDeletePost(postId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .update({ status: 'deleted' })
        .eq('id', postId)
        .select('id')
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error('Could not delete post.');
      }
    },
    onSuccess: () => {
      // The post drops out of the feed, and deleting it may free an active slot.
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void useAuthStore.getState().refreshProfile();
    },
  });
}
