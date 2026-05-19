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

type SortColumn = 'created_at' | 'comment_count' | 'average_spice_level';
type CursorValue = string | number | null;

export interface FeedCursor {
  value: CursorValue;
  id: string;
}

type FeedPage = {
  data: PostRow[];
  nextCursor: FeedCursor | null;
};

function sortColumnFor(sort: SortOrder): SortColumn {
  if (sort === 'recent') return 'created_at';
  if (sort === 'comments') return 'comment_count';
  return 'average_spice_level';
}

function cursorFrom(row: PostRow, sort: SortOrder): FeedCursor {
  if (sort === 'recent') return { value: row.created_at, id: row.id };
  if (sort === 'comments') return { value: row.comment_count, id: row.id };
  return { value: row.average_spice_level, id: row.id };
}

async function fetchFeedPage(filter: FeedFilter, cursor: FeedCursor | null): Promise<FeedPage> {
  const col = sortColumnFor(filter.sort);

  let query = supabase.from('posts').select('*').eq('status', 'active');

  if (filter.category !== undefined) {
    query = query.eq('category', filter.category);
  }

  if (filter.minSpice > 0) {
    query = query.gte('average_spice_level', filter.minSpice);
  }

  // Cursor: keep rows strictly past the last seen (sortValue, id) tuple.
  // For DESC sort, "past" means lexicographically less than the cursor.
  if (cursor) {
    if (cursor.value === null) {
      // NULL sort value (only possible for spice with NULLS LAST). All
      // remaining rows are also NULL, ordered by id DESC.
      query = query.is(col, null).lt('id', cursor.id);
    } else {
      const v = typeof cursor.value === 'string' ? cursor.value : String(cursor.value);
      // (col, id) < (cursorValue, cursorId)  ==>  col < v  OR  (col = v AND id < cursorId)
      query = query.or(`${col}.lt.${v},and(${col}.eq.${v},id.lt.${cursor.id})`);
    }
  }

  query = query
    .order(col, { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const last = rows[rows.length - 1];
  const nextCursor = rows.length === PAGE_SIZE && last ? cursorFrom(last, filter.sort) : null;

  return { data: rows, nextCursor };
}

export function useFeed(filter: FeedFilter): UseInfiniteQueryResult<InfiniteData<FeedPage>, Error> {
  return useInfiniteQuery<
    FeedPage,
    Error,
    InfiniteData<FeedPage>,
    [string, FeedFilter],
    FeedCursor | null
  >({
    queryKey: ['feed', filter],
    queryFn: ({ pageParam }) => fetchFeedPage(filter, pageParam),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
