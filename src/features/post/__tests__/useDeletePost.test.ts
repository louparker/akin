import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useDeletePost } from '../api/useDeletePost';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockRefreshProfile = jest.fn();
jest.mock('@/features/auth/store/useAuthStore', () => {
  const useAuthStore = () => ({ session: { user: { id: 'user-1' } } });
  (useAuthStore as unknown as { getState: () => unknown }).getState = () => ({
    refreshProfile: mockRefreshProfile,
  });
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

describe('useDeletePost', () => {
  it('soft-deletes the post, invalidates feed, and refreshes the profile', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: { id: 'post-1' }, error: null }));
    const { client, Wrapper } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useDeletePost('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const chain = mockedFrom.mock.results[0]?.value as { update: jest.Mock };
    expect(chain.update).toHaveBeenCalledWith({ status: 'deleted' });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['feed'] });
    expect(mockRefreshProfile).toHaveBeenCalled();
  });

  it('throws when the server returns no row (not the author / already gone)', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useDeletePost('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
