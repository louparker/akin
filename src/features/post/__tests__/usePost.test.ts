import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { usePost } from '../api/usePost';
import type { Tables } from '@/types/database';

type PostRow = Tables<'posts'>;
type CommentRow = Tables<'comments'>;

// ── expo-router mock ──────────────────────────────────────────────────────────
// Simulate useFocusEffect via a plain useEffect so cleanup fires on unmount.
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  return {
    useFocusEffect: (cb: () => (() => void) | void) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      React.useEffect(() => cb() ?? undefined);
    },
  };
});

// ── Feature-flags mock ────────────────────────────────────────────────────────
const mockUseFlag = jest.fn<boolean, [string]>().mockReturnValue(true);

jest.mock('@/features/flags/api/useFeatureFlags', () => ({
  useFlag: (...args: [string]) => mockUseFlag(...args),
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────
// Per-test handles for the callbacks captured during channel setup.
let capturedInsertCb: (() => void) | null = null;
let capturedSubscribeCb: ((status: string) => void) | null = null;

function makeChannelInstance() {
  const instance = {
    on: jest.fn().mockImplementation((_event: string, _filter: unknown, cb: () => void) => {
      capturedInsertCb = cb;
      return instance;
    }),
    subscribe: jest.fn().mockImplementation((cb: (status: string) => void) => {
      capturedSubscribeCb = cb;
      return instance;
    }),
  };
  return instance;
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn().mockResolvedValue(undefined),
  },
}));

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
  capturedInsertCb = null;
  capturedSubscribeCb = null;
  mockUseFlag.mockReturnValue(true);
  mockedSupabase.channel.mockReturnValue(makeChannelInstance());
});

// ── Tests ─────────────────────────────────────────────────────────────────────

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

  describe('realtime subscription', () => {
    it('subscribes on mount via useFocusEffect', async () => {
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

    it('invalidates the post query when a new comment INSERT arrives', async () => {
      const post = makePost();
      mockedSupabase.from.mockReturnValue(makeFromChain({ ...post, comments: [] }));

      const { Wrapper, client } = makeWrapper();
      renderHook(() => usePost('post-1'), { wrapper: Wrapper });

      await waitFor(() => expect(capturedInsertCb).not.toBeNull());

      const spy = jest.spyOn(client, 'invalidateQueries');
      act(() => {
        capturedInsertCb?.();
      });

      expect(spy).toHaveBeenCalledWith({ queryKey: ['post', 'post-1'] });
    });

    it('does not create a channel when realtime_open flag is false', async () => {
      mockUseFlag.mockReturnValue(false);
      const post = makePost();
      mockedSupabase.from.mockReturnValue(makeFromChain({ ...post, comments: [] }));

      const { Wrapper } = makeWrapper();
      renderHook(() => usePost('post-1'), { wrapper: Wrapper });

      await waitFor(() => expect(mockedSupabase.from).toHaveBeenCalled());
      expect(mockedSupabase.channel).not.toHaveBeenCalled();
    });

    it('skips invalidation on the first SUBSCRIBED (data is fresh from initial fetch)', async () => {
      const post = makePost();
      mockedSupabase.from.mockReturnValue(makeFromChain({ ...post, comments: [] }));

      const { Wrapper, client } = makeWrapper();
      renderHook(() => usePost('post-1'), { wrapper: Wrapper });

      await waitFor(() => expect(capturedSubscribeCb).not.toBeNull());

      const spy = jest.spyOn(client, 'invalidateQueries');
      act(() => {
        capturedSubscribeCb?.('SUBSCRIBED');
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('invalidates on the second SUBSCRIBED to catch up after reconnect or refocus', async () => {
      const post = makePost();
      mockedSupabase.from.mockReturnValue(makeFromChain({ ...post, comments: [] }));

      const { Wrapper, client } = makeWrapper();
      renderHook(() => usePost('post-1'), { wrapper: Wrapper });

      await waitFor(() => expect(capturedSubscribeCb).not.toBeNull());

      act(() => {
        capturedSubscribeCb?.('SUBSCRIBED');
      }); // first — skipped

      const spy = jest.spyOn(client, 'invalidateQueries');
      act(() => {
        capturedSubscribeCb?.('SUBSCRIBED');
      }); // second — reconnect

      expect(spy).toHaveBeenCalledWith({ queryKey: ['post', 'post-1'] });
    });
  });
});
