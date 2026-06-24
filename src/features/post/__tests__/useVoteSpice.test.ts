import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useVoteSpice } from '../api/useVoteSpice';

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
});
