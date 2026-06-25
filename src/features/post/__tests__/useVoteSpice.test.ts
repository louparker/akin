import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useVoteSpice, VoteSpiceError } from '../api/useVoteSpice';
import type { PostWithComments } from '../api/usePost';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({ session: { user: { id: 'user-1' } } }),
}));

const mockedFrom = (supabase as unknown as { from: jest.Mock }).from;

function makeUpsertChain(result: { error: unknown }) {
  return { upsert: jest.fn().mockResolvedValue(result) };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useVoteSpice', () => {
  function makeCachedPost(overrides: Partial<PostWithComments> = {}): PostWithComments {
    return {
      id: 'post-1',
      title: 'A spicy post',
      body: 'Body text',
      category: 'vent_space',
      author_id: 'user-2',
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
      comments: [],
      userSpiceVote: null,
      ...overrides,
    };
  }

  it('upserts the vote so re-voting updates it, then refreshes post + feed', async () => {
    mockedFrom.mockReturnValue(makeUpsertChain({ error: null }));
    const { client, Wrapper } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useVoteSpice('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ level: 4 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Upsert on the (post_id, user_id) primary key — a second tap updates the
    // existing row instead of hitting a duplicate-key error.
    const chain = mockedFrom.mock.results[0]?.value as { upsert: jest.Mock };
    expect(chain.upsert).toHaveBeenCalledWith(
      { post_id: 'post-1', score: 4, user_id: 'user-1' },
      { onConflict: 'post_id,user_id' },
    );
    // The denormalised average_spice_level changed, so both the post detail and
    // the feed cards are stale.
    expect(spy).toHaveBeenCalledWith({ queryKey: ['post', 'post-1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['feed'] });
  });

  it('updates the cached post aggregate immediately after a first vote', async () => {
    mockedFrom.mockReturnValue(makeUpsertChain({ error: null }));
    const { client, Wrapper } = makeWrapper();
    client.setQueryData(['post', 'post-1'], makeCachedPost());

    const { result } = renderHook(() => useVoteSpice('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ level: 4 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<PostWithComments>(['post', 'post-1']);
    expect(cached?.userSpiceVote).toBe(4);
    expect(cached?.spice_vote_count).toBe(1);
    expect(cached?.total_spice_score).toBe(4);
    expect(cached?.average_spice_level).toBe(4);
  });

  it('updates the cached post aggregate immediately after changing an existing vote', async () => {
    mockedFrom.mockReturnValue(makeUpsertChain({ error: null }));
    const { client, Wrapper } = makeWrapper();
    client.setQueryData(
      ['post', 'post-1'],
      makeCachedPost({
        userSpiceVote: 2,
        spice_vote_count: 1,
        total_spice_score: 2,
        average_spice_level: 2,
      }),
    );

    const { result } = renderHook(() => useVoteSpice('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ level: 5 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<PostWithComments>(['post', 'post-1']);
    expect(cached?.userSpiceVote).toBe(5);
    expect(cached?.spice_vote_count).toBe(1);
    expect(cached?.total_spice_score).toBe(5);
    expect(cached?.average_spice_level).toBe(5);
  });

  it('throws on a Supabase error', async () => {
    mockedFrom.mockReturnValue(makeUpsertChain({ error: { message: 'DB error' } }));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useVoteSpice('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ level: 4 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('classifies spice vote RLS denials as participant-required errors', async () => {
    mockedFrom.mockReturnValue(
      makeUpsertChain({
        error: {
          code: '42501',
          message: 'new row violates row-level security policy for table "spice_votes"',
        },
      }),
    );
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useVoteSpice('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ level: 4 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(VoteSpiceError);
    expect(result.current.error?.kind).toBe('participant_required');
  });
});
