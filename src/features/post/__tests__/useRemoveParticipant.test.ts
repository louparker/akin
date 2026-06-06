import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useRemoveParticipant, RemoveParticipantError } from '../api/useRemoveParticipant';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

function mockInsert(result: { error: { code?: string; message: string } | null }) {
  const insert = jest.fn().mockResolvedValue(result);
  (supabase.from as jest.Mock).mockReturnValue({ insert });
  return insert;
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    session: { user: { id: 'op-user' } } as never,
    profile: {
      id: 'op-user',
      anonymous_identifier: 'CrimsonFox42',
    } as never,
    isLoading: false,
  });
});

describe('useRemoveParticipant', () => {
  it('inserts a removal row with the caller as removed_by', async () => {
    const insert = mockInsert({ error: null });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveParticipant(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        postId: 'post-1',
        removedUserId: 'commenter-2',
      });
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock; reference, not invocation
    expect(supabase.from).toHaveBeenCalledWith('post_participant_removals');
    expect(insert).toHaveBeenCalledWith({
      post_id: 'post-1',
      removed_user_id: 'commenter-2',
      removed_by: 'op-user',
    });
  });

  it('invalidates the post query on success', async () => {
    mockInsert({ error: null });

    const { Wrapper, client } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useRemoveParticipant(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        postId: 'post-1',
        removedUserId: 'commenter-2',
      });
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['post', 'post-1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['feed'] });
  });

  it('maps an RLS 42501 error to a forbidden RemoveParticipantError', async () => {
    mockInsert({
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveParticipant(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ postId: 'p', removedUserId: 'u' });
      } catch {
        // swallow — assert via error state below
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(RemoveParticipantError);
    expect(result.current.error?.kind).toBe('forbidden');
  });

  it('maps a network error to network kind', async () => {
    mockInsert({ error: { message: 'network request failed' } });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveParticipant(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ postId: 'p', removedUserId: 'u' });
      } catch {
        // swallow
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.kind).toBe('network');
  });

  it('throws unknown if there is no session', async () => {
    useAuthStore.setState({ session: null, profile: null, isLoading: false });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveParticipant(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ postId: 'p', removedUserId: 'u' });
      } catch {
        // swallow
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.kind).toBe('unknown');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock; reference, not invocation
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
