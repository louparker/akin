import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useBlock } from '../api/useBlock';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({ session: { user: { id: 'user-1' } } }),
}));

const mockedFrom = (supabase as unknown as { from: jest.Mock }).from;

function makeInsertChain(result: { error: unknown }) {
  return { insert: jest.fn().mockResolvedValue(result) };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('useBlock', () => {
  it('invalidates the feed query on success', async () => {
    mockedFrom.mockReturnValue(makeInsertChain({ error: null }));
    const { client, Wrapper } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useBlock(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ blocked_id: 'user-2', blocked_identifier: 'BlueWolf99' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['feed'] });
  });

  it('also invalidates the specific post query when postId is provided', async () => {
    mockedFrom.mockReturnValue(makeInsertChain({ error: null }));
    const { client, Wrapper } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useBlock(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        blocked_id: 'user-2',
        blocked_identifier: 'BlueWolf99',
        postId: 'post-abc',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['feed'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['post', 'post-abc'] });
  });

  it('does not invalidate a post query when postId is absent', async () => {
    mockedFrom.mockReturnValue(makeInsertChain({ error: null }));
    const { client, Wrapper } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useBlock(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ blocked_id: 'user-2', blocked_identifier: 'BlueWolf99' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const postInvalidations = spy.mock.calls.filter((c) => {
      const qk = (c[0] as { queryKey: unknown[] }).queryKey;
      return Array.isArray(qk) && qk[0] === 'post';
    });
    expect(postInvalidations).toHaveLength(0);
  });
});
