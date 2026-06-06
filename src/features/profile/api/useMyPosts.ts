import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { Tables } from '@/types/database';

export type PostRow = Tables<'posts'>;

/**
 * All active posts authored by the current user, most recent first.
 *
 * No pagination in v1 — per ARCHITECTURE.md, a user can be active in at most
 * 3 posts at once and accumulates few enough posts over time that an unbounded
 * list is fine. Revisit if real usage shows otherwise.
 *
 * RLS handles visibility — soft-deleted posts (status != 'active') are filtered
 * server-side; blocked-author posts are filtered for the viewer (irrelevant
 * here since the viewer IS the author).
 */
async function fetchMyPosts(userId: string): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export function useMyPosts(): UseQueryResult<PostRow[], Error> {
  const userId = useAuthStore((s) => s.session?.user.id) ?? null;

  return useQuery<PostRow[], Error>({
    queryKey: ['profile', 'mine', 'posts', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return fetchMyPosts(userId);
    },
    enabled: userId !== null,
  });
}
