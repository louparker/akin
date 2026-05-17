import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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

  useEffect(() => {
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  return useQuery<PostWithComments, Error>({
    queryKey: ['post', id],
    queryFn: () => fetchPost(id),
    enabled: Boolean(id),
  });
}
