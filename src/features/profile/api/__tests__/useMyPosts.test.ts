import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useMyPosts } from '../useMyPosts';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

function mockSelectChain(rows: unknown[] | null, error: { message: string } | null = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: rows, error }),
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
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
    session: { user: { id: 'me-1' } } as never,
    profile: { id: 'me-1', anonymous_identifier: 'CrimsonFox42' } as never,
    isLoading: false,
  });
});

describe('useMyPosts', () => {
  it('queries posts filtered by author_id = current user', async () => {
    const chain = mockSelectChain([
      { id: 'p1', author_id: 'me-1' },
      { id: 'p2', author_id: 'me-1' },
    ]);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyPosts(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock; reference, not invocation
    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(chain.eq).toHaveBeenCalledWith('author_id', 'me-1');
    expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toHaveLength(2);
  });

  it('returns empty array when there is no session', async () => {
    useAuthStore.setState({ session: null, profile: null, isLoading: false });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyPosts(), { wrapper: Wrapper });

    // Disabled queries stay in idle state; data starts as undefined.
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.data).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock; reference, not invocation
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('surfaces supabase errors to React Query', async () => {
    mockSelectChain(null, { message: 'boom' });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyPosts(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
  });

  it('returns empty array when supabase returns no data', async () => {
    mockSelectChain(null);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyPosts(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
