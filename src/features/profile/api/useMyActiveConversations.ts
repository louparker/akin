import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { Tables } from '@/types/database';

export type PostRow = Tables<'posts'>;

/**
 * Posts where the current user has commented AND the post still has open slots
 * (is_full = false). These are the conversations that count toward the user's
 * 3-post active cap per ARCHITECTURE.md §4.
 *
 * Two-step fetch:
 *   1. distinct post_ids of posts I've commented on
 *   2. open active posts among those, sorted by most recent first
 *
 * A view or RPC would be cleaner but adds a migration cost we're not paying in
 * v1. The two-step is bounded by the 3-cap on the client side — at most 3 rows
 * come back, with at most one extra round trip.
 *
 * RLS handles post visibility — blocked-author posts and posts the user was
 * removed from are filtered server-side (see migrations 0007 and 0017).
 */
async function fetchMyActiveConversations(userId: string): Promise<PostRow[]> {
  // Step 1: distinct post_ids from my comments. We can't SELECT DISTINCT via
  // PostgREST, so dedupe client-side after fetch.
  const { data: commentRows, error: commentsErr } = await supabase
    .from('comments')
    .select('post_id')
    .eq('author_id', userId);

  if (commentsErr) {
    throw new Error(commentsErr.message);
  }

  if (!commentRows || commentRows.length === 0) {
    return [];
  }

  const postIds = Array.from(new Set(commentRows.map((c) => c.post_id)));

  // Step 2: only the open ones, sorted recent.
  const { data: posts, error: postsErr } = await supabase
    .from('posts')
    .select('*')
    .in('id', postIds)
    .eq('is_full', false)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (postsErr) {
    throw new Error(postsErr.message);
  }
  return posts ?? [];
}

export function useMyActiveConversations(): UseQueryResult<PostRow[], Error> {
  const userId = useAuthStore((s) => s.session?.user.id) ?? null;

  return useQuery<PostRow[], Error>({
    queryKey: ['profile', 'mine', 'active', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return fetchMyActiveConversations(userId);
    },
    enabled: userId !== null,
  });
}
