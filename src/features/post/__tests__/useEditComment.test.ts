import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditComment, EditCommentError } from '../api/useEditComment';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({ session: { user: { id: 'user-1' } } }),
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

describe('useEditComment', () => {
  it('updates the comment body and invalidates the post query on success', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: { id: 'comment-1' }, error: null }));
    const { client, Wrapper } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useEditComment('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ commentId: 'comment-1', body: 'Updated body' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['post', 'post-1'] });
  });

  it('throws EditCommentError window_closed when the server returns null (RLS blocked)', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useEditComment('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ commentId: 'comment-1', body: 'Updated body' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(EditCommentError);
    expect((result.current.error as EditCommentError).kind).toBe('window_closed');
  });

  it('throws EditCommentError window_closed on P0021 (edit window expired)', async () => {
    mockedFrom.mockReturnValue(
      makeChain({ data: null, error: { code: 'P0021', message: 'closed' } }),
    );
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useEditComment('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ commentId: 'comment-1', body: 'Updated body' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as EditCommentError).kind).toBe('window_closed');
  });

  it('throws EditCommentError unknown on a Supabase error', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useEditComment('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ commentId: 'comment-1', body: 'Updated body' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as EditCommentError).kind).toBe('unknown');
  });
});
