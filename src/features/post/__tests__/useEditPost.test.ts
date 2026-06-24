import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditPost, EditPostError } from '../api/useEditPost';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockedFrom = (supabase as unknown as { from: jest.Mock }).from;

function makeChain(result: { data: unknown; error: unknown }) {
  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
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

describe('useEditPost', () => {
  it('updates title + body and invalidates post + feed on success', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: { id: 'post-1' }, error: null }));
    const { client, Wrapper } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useEditPost('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ title: 'New title', body: 'New body' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const chain = mockedFrom.mock.results[0]?.value as { update: jest.Mock };
    expect(chain.update).toHaveBeenCalledWith({ title: 'New title', body: 'New body' });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['post', 'post-1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['feed'] });
  });

  it('throws window_closed on P0021 (edit window expired)', async () => {
    mockedFrom.mockReturnValue(
      makeChain({ data: null, error: { code: 'P0021', message: 'closed' } }),
    );
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useEditPost('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ title: 'New', body: 'New' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as EditPostError).kind).toBe('window_closed');
  });

  it('throws window_closed when no row is returned (RLS blocked)', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useEditPost('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ title: 'New', body: 'New' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as EditPostError).kind).toBe('window_closed');
  });
});
