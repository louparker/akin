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
}

async function fetchPost(id: string): Promise<PostWithComments> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, comments(*)')
    .eq('id', id)
    .order('created_at', { referencedTable: 'comments', ascending: true })
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const comments = (data as PostRow & { comments: CommentRow[] | null }).comments ?? [];

  return {
    ...(data as PostRow),
    comments,
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
