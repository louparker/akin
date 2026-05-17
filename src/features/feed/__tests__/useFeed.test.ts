import { renderHook, waitFor } from '@testing-library/react-native';
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

    // After clearAllMocks we need a fresh chain
    const freshChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: posts, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(freshChain);

    const { result } = renderHook(() => useFeed({ sort: 'recent', minSpice: 0 }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const allPosts = result.current.data?.pages.flatMap((p) => p.data) ?? [];
    expect(allPosts).toHaveLength(2);
    expect(allPosts[0]?.id).toBe('post-1');
  });

  it('filters by category when provided', async () => {
    const posts = [makePost({ id: 'cat-post-1', category: 'vent_space' })];

    const freshChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: posts, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(freshChain);

    const { result } = renderHook(
      () => useFeed({ sort: 'recent', minSpice: 0, category: 'vent_space' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify .eq was called with the category filter (once for status, once for category)
    expect(freshChain.eq).toHaveBeenCalledWith('category', 'vent_space');

    const allPosts = result.current.data?.pages.flatMap((p) => p.data) ?? [];
    expect(allPosts[0]?.category).toBe('vent_space');
  });

  it('filters by minimum spice level', async () => {
    const posts = [makePost({ id: 'spicy-1', average_spice_level: 3 })];

    const freshChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: posts, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(freshChain);

    const { result } = renderHook(() => useFeed({ sort: 'recent', minSpice: 3 }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify .gte was called with the spice filter
    expect(freshChain.gte).toHaveBeenCalledWith('average_spice_level', 3);

    const allPosts = result.current.data?.pages.flatMap((p) => p.data) ?? [];
    expect(allPosts[0]?.average_spice_level).toBe(3);
  });
});
