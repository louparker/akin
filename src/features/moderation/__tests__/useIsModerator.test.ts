import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useIsModerator } from '../api/useIsModerator';

jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

const mockedRpc = (supabase as unknown as { rpc: jest.Mock }).rpc;

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  };
}

function setSession(userId: string | null) {
  if (userId === null) {
    useAuthStore.setState({ session: null, profile: null, isLoading: false });
    return;
  }
  useAuthStore.setState({
    session: { user: { id: userId } } as unknown as Session,
    profile: null,
    isLoading: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setSession('user-1');
});

afterEach(() => {
  setSession(null);
});

describe('useIsModerator', () => {
  it('returns false for non-moderator users', async () => {
    mockedRpc.mockResolvedValue({ data: false, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIsModerator(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it('returns true for moderator users', async () => {
    mockedRpc.mockResolvedValue({ data: true, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIsModerator(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('does not run the RPC when there is no session', () => {
    setSession(null);
    mockedRpc.mockResolvedValue({ data: true, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIsModerator(), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedRpc).not.toHaveBeenCalled();
  });

  it('does not share cache across different users (regression: every-other-login flake)', async () => {
    // User A signs in, RPC returns false (e.g. stale session/JWT race).
    setSession('user-a');
    mockedRpc.mockResolvedValueOnce({ data: false, error: null });
    const { Wrapper: WrapperA } = makeWrapper();
    const { result: a } = renderHook(() => useIsModerator(), { wrapper: WrapperA });
    await waitFor(() => expect(a.current.isSuccess).toBe(true));
    expect(a.current.data).toBe(false);

    // User B (moderator) signs in. Even sharing a QueryClient, the key is
    // user-scoped so they must NOT inherit user A's cached `false`.
    setSession('user-b');
    mockedRpc.mockResolvedValueOnce({ data: true, error: null });
    const { Wrapper: WrapperB } = makeWrapper();
    const { result: b } = renderHook(() => useIsModerator(), { wrapper: WrapperB });
    await waitFor(() => expect(b.current.isSuccess).toBe(true));
    expect(b.current.data).toBe(true);
  });
});
