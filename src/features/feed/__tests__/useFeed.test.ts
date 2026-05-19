import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useFeed } from '../api/useFeed';
import type { Tables } from '@/types/database';

type PostRow = Tables<'posts'>;

jest.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: jest.fn(),
    },
  };
});

function makePost(overrides: Partial<PostRow> = {}): PostRow {
  return {
    id: 'post-1',
    title: 'A vent',
    body: 'Body text',
    category: 'vent_space',
    author_id: 'user-1',
    author_identifier: 'CrimsonFox42',
    participant_count: 1,
    is_full: false,
    comment_count: 0,
    average_spice_level: null,
    total_spice_score: 0,
    spice_vote_count: 0,
    status: 'active',
    created_at: '2026-04-25T10:00:00Z',
    updated_at: '2026-04-25T10:00:00Z',
    view_count: 0,
    language: 'en',
    ...overrides,
  };
}

interface MockChain {
  select: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  is: jest.Mock;
  lt: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
}

function mockChain(result: { data: PostRow[] | null; error: unknown }): MockChain {
  const chain: Partial<MockChain> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  chain.is = jest.fn().mockReturnValue(chain);
  chain.lt = jest.fn().mockReturnValue(chain);
  chain.or = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  // `limit` is the terminal call → returns a thenable.
  chain.limit = jest.fn().mockResolvedValue(result);
  return chain as MockChain;
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useFeed', () => {
  it('returns posts for the default filter', async () => {
    const posts = [makePost({ id: 'post-1' }), makePost({ id: 'post-2' })];
    const chain = mockChain({ data: posts, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);

    const { result } = renderHook(() => useFeed({ sort: 'recent', minSpice: 0 }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const allPosts = result.current.data?.pages.flatMap((p) => p.data) ?? [];
    expect(allPosts).toHaveLength(2);
    expect(allPosts[0]?.id).toBe('post-1');

    // No cursor on first page — `or`/`is`/`lt` should not have been called.
    expect(chain.or).not.toHaveBeenCalled();
    expect(chain.is).not.toHaveBeenCalled();
    expect(chain.lt).not.toHaveBeenCalled();

    // Sorts by created_at then id tiebreaker.
    expect(chain.order).toHaveBeenNthCalledWith(1, 'created_at', {
      ascending: false,
      nullsFirst: false,
    });
    expect(chain.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(20);
  });

  it('filters by category when provided', async () => {
    const posts = [makePost({ id: 'cat-post-1', category: 'vent_space' })];
    const chain = mockChain({ data: posts, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);

    const { result } = renderHook(
      () => useFeed({ sort: 'recent', minSpice: 0, category: 'vent_space' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.eq).toHaveBeenCalledWith('category', 'vent_space');

    const allPosts = result.current.data?.pages.flatMap((p) => p.data) ?? [];
    expect(allPosts[0]?.category).toBe('vent_space');
  });

  it('filters by minimum spice level', async () => {
    const posts = [makePost({ id: 'spicy-1', average_spice_level: 3 })];
    const chain = mockChain({ data: posts, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);

    const { result } = renderHook(() => useFeed({ sort: 'recent', minSpice: 3 }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.gte).toHaveBeenCalledWith('average_spice_level', 3);

    const allPosts = result.current.data?.pages.flatMap((p) => p.data) ?? [];
    expect(allPosts[0]?.average_spice_level).toBe(3);
  });

  it('uses (sort_col, id) cursor for the next page', async () => {
    const firstPage = Array.from({ length: 20 }, (_, i) =>
      makePost({ id: `p-${i}`, created_at: `2026-04-25T10:00:${String(i).padStart(2, '0')}Z` }),
    );
    const lastRow = firstPage[firstPage.length - 1]!;
    const secondPage = [makePost({ id: 'p-21' })];

    // First call returns full page (signals more available); second returns the next page.
    const firstChain = mockChain({ data: firstPage, error: null });
    const secondChain = mockChain({ data: secondPage, error: null });
    (supabase.from as jest.Mock).mockReturnValueOnce(firstChain).mockReturnValueOnce(secondChain);

    const { result } = renderHook(() => useFeed({ sort: 'recent', minSpice: 0 }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2));

    // Cursor predicate must be a tuple comparison against the last row.
    expect(secondChain.or).toHaveBeenCalledTimes(1);
    const orArg = secondChain.or.mock.calls[0]![0] as string;
    expect(orArg).toContain(`created_at.lt.${lastRow.created_at}`);
    expect(orArg).toContain(`and(created_at.eq.${lastRow.created_at},id.lt.${lastRow.id})`);
  });
});
