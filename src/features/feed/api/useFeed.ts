import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables, Enums } from '@/types/database';

export type SortOrder = 'recent' | 'comments' | 'spice';
export type PostCategory = Enums<'post_category'>;
export type PostRow = Tables<'posts'>;

export interface FeedFilter {
  sort: SortOrder;
  minSpice: number;
  category?: PostCategory;
}

const PAGE_SIZE = 20;

type FeedPage = {
  data: PostRow[];
  nextCursor: number | null;
};

async function fetchFeedPage(filter: FeedFilter, cursor: number): Promise<FeedPage> {
  let query = supabase
    .from('posts')
    .select('*')
    .eq('status', 'active')
    .range(cursor, cursor + PAGE_SIZE - 1);

  if (filter.category !== undefined) {
    query = query.eq('category', filter.category);
  }

  if (filter.minSpice > 0) {
    query = query.gte('average_spice_level', filter.minSpice);
  }

  if (filter.sort === 'recent') {
    query = query.order('created_at', { ascending: false });
  } else if (filter.sort === 'comments') {
    query = query.order('comment_count', { ascending: false });
  } else {
    // spice
    query = query.order('average_spice_level', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const nextCursor = rows.length === PAGE_SIZE ? cursor + PAGE_SIZE : null;

  return { data: rows, nextCursor };
}

export function useFeed(filter: FeedFilter): UseInfiniteQueryResult<InfiniteData<FeedPage>, Error> {
  return useInfiniteQuery<FeedPage, Error, InfiniteData<FeedPage>, [string, FeedFilter], number>({
    queryKey: ['feed', filter],
    queryFn: ({ pageParam }) => fetchFeedPage(filter, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
