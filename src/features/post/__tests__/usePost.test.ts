import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { usePost } from '../api/usePost';
import type { Tables } from '@/types/database';

type PostRow = Tables<'posts'>;
type CommentRow = Tables<'comments'>;

// ── Supabase mock ─────────────────────────────────────────────────────────────

jest.mock('@/lib/supabase', () => {
  const channelSubscribe = jest.fn().mockReturnThis();
  const channelOn = jest.fn().mockReturnThis();
  const removeChannel = jest.fn().mockResolvedValue(undefined);
  const channel = jest.fn(() => ({ on: channelOn, subscribe: channelSubscribe }));
  return {
    supabase: {
      from: jest.fn(),
      channel,
      removeChannel,
    },
  };
});

// Convenience accessors for the mock functions
const mockedSupabase = supabase as unknown as {
  from: jest.Mock;
  channel: jest.Mock;
  removeChannel: jest.Mock;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(overrides: Partial<PostRow> = {}): PostRow {
  return {
    id: 'post-1',
    title: 'Test post',
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

function makeComment(overrides: Partial<CommentRow> = {}): CommentRow {
  return {
    id: 'comment-1',
    post_id: 'post-1',
    author_id: 'user-2',
    author_identifier: 'BlueWolf99',
    body: 'A reply.',
    status: 'active',
    removed_by_op: false,
    created_at: '2026-04-25T10:05:00Z',
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
  return { Wrapper, client };
}

function makeFromChain(responseData: unknown) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: responseData, error: null }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  // Re-set up the channel mock to return the right shape after clearAllMocks
  const channelInstance = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  };
  mockedSupabase.channel.mockReturnValue(channelInstance);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('usePost', () => {
  it('returns post data with comments', async () => {
    const post = makePost();
    const comment = makeComment();
    mockedSupabase.from.mockReturnValue(makeFromChain({ ...post, comments: [comment] }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => usePost('post-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe('post-1');
    expect(result.current.data?.comments).toHaveLength(1);
    expect(result.current.data?.comments[0]?.id).toBe('comment-1');
  });

  it('subscribes to realtime updates on mount', async () => {
    const post = makePost();
    mockedSupabase.from.mockReturnValue(makeFromChain({ ...post, comments: [] }));

    const { Wrapper } = makeWrapper();
    renderHook(() => usePost('post-1'), { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockedSupabase.channel).toHaveBeenCalledWith('post:post-1');
    });

    const channelInstance = mockedSupabase.channel.mock.results[0]?.value as {
      on: jest.Mock;
      subscribe: jest.Mock;
    };

    expect(channelInstance.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: 'post_id=eq.post-1',
      }),
      expect.any(Function),
    );
    expect(channelInstance.subscribe).toHaveBeenCalled();
  });

  it('unsubscribes on unmount', async () => {
    const post = makePost();
    mockedSupabase.from.mockReturnValue(makeFromChain({ ...post, comments: [] }));

    const { Wrapper } = makeWrapper();
    const { result, unmount } = renderHook(() => usePost('post-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      unmount();
    });

    expect(mockedSupabase.removeChannel).toHaveBeenCalled();
  });
});
