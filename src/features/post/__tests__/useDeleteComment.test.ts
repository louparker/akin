import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useDeleteComment } from '../api/useDeleteComment';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockRefreshProfile = jest.fn();

jest.mock('@/features/auth/store/useAuthStore', () => {
  const useAuthStore = () => ({ session: { user: { id: 'user-1' } } });
  useAuthStore.getState = () => ({ refreshProfile: mockRefreshProfile });
  return { useAuthStore };
});

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

describe('useDeleteComment', () => {
  it('soft-deletes the comment and invalidates the post query on success', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: { id: 'comment-1' }, error: null }));
    const { client, Wrapper } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteComment('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ commentId: 'comment-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const chain = mockedFrom.mock.results[0]?.value as { update: jest.Mock };
    expect(chain.update).toHaveBeenCalledWith({ status: 'deleted' });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['post', 'post-1'] });
    // Refresh the profile so the active-conversations count reflects a freed
    // slot when the user leaves a conversation by deleting their last comment.
    expect(mockRefreshProfile).toHaveBeenCalled();
  });

  it('throws on a Supabase error', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useDeleteComment('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ commentId: 'comment-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
