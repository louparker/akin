import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useFlag } from '@/features/flags/api/useFeatureFlags';
import type { Tables } from '@/types/database';

export type PostRow = Tables<'posts'>;
export type CommentRow = Tables<'comments'>;

export interface PostWithComments extends PostRow {
  comments: CommentRow[];
  // The current user's own spice vote on this post (null if they haven't voted).
  // RLS on spice_votes only exposes the requester's own row, so the embed is safe.
  userSpiceVote: number | null;
}

async function fetchPost(id: string): Promise<PostWithComments> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, comments(*), spice_votes(score)')
    .eq('id', id)
    .order('created_at', { referencedTable: 'comments', ascending: true })
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as PostRow & {
    comments: CommentRow[] | null;
    spice_votes: { score: number }[] | null;
  };

  return {
    ...(data as PostRow),
    comments: row.comments ?? [],
    userSpiceVote: row.spice_votes?.[0]?.score ?? null,
  };
}

export function usePost(id: string): UseQueryResult<PostWithComments, Error> {
  const queryClient = useQueryClient();
  const realtimeOpen = useFlag('realtime_open');
  // Skip invalidation on the first SUBSCRIBED — the initial fetch already has fresh data.
  // Every subsequent SUBSCRIBED (reconnect, refocus) means we may have missed events.
  const wasSubscribedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!realtimeOpen || !id) return;

      const channel = supabase
        .channel(`post:${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'comments',
            filter: `post_id=eq.${id}`,
          },
          () => {
            void queryClient.invalidateQueries({ queryKey: ['post', id] });
          },
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            if (wasSubscribedRef.current) {
              void queryClient.invalidateQueries({ queryKey: ['post', id] });
            }
            wasSubscribedRef.current = true;
          }
        });

      return () => {
        void supabase.removeChannel(channel);
      };
    }, [id, queryClient, realtimeOpen]),
  );

  return useQuery<PostWithComments, Error>({
    queryKey: ['post', id],
    queryFn: () => fetchPost(id),
    enabled: Boolean(id),
  });
}
