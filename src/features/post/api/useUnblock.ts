import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export function useUnblock(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation<void, Error, string>({
    mutationFn: async (blocked_id: string) => {
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', session.user.id)
        .eq('blocked_id', blocked_id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-blocks'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
