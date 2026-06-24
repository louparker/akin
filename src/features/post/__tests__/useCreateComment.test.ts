import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useCreateComment, CreateCommentError } from '../api/useCreateComment';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockRefreshProfile = jest.fn();
jest.mock('@/features/auth/store/useAuthStore', () => {
  const useAuthStore = () => ({
    session: { user: { id: 'user-1' } },
    profile: { anonymous_identifier: 'CrimsonFox42' },
  });
  (useAuthStore as unknown as { getState: () => unknown }).getState = () => ({
    refreshProfile: mockRefreshProfile,
  });
  return { useAuthStore };
});

jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCreateComment', () => {
  it('refreshes the profile and invalidates post + feed on success', async () => {
    mockedFrom.mockReturnValue(makeInsertChain({ error: null }));
    const { client, Wrapper } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateComment('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ body: 'Nice take' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Mirrors the post-create flow: the active-conversations count must refresh
    // off the trigger-updated profile without a manual pull.
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['post', 'post-1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['feed'] });
  });

  it('does not refresh the profile when the conversation is full', async () => {
    mockedFrom.mockReturnValue(makeInsertChain({ error: { code: 'P0001', message: 'full' } }));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useCreateComment('post-1'), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ body: 'Nice take' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as CreateCommentError).kind).toBe('post_full');
    expect(mockRefreshProfile).not.toHaveBeenCalled();
  });
});
