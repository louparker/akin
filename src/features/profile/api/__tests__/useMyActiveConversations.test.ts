import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useMyActiveConversations } from '../useMyActiveConversations';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

interface ChainOpts {
  commentsResponse?: { data: unknown[] | null; error: { message: string } | null };
  postsResponse?: { data: unknown[] | null; error: { message: string } | null };
}

function mockTwoStep({ commentsResponse, postsResponse }: ChainOpts) {
  const commentsChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue(commentsResponse ?? { data: [], error: null }),
  };
  const postsChain = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(postsResponse ?? { data: [], error: null }),
  };

  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'comments') return commentsChain;
    if (table === 'posts') return postsChain;
    throw new Error(`unexpected table: ${table}`);
  });

  return { commentsChain, postsChain };
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

describe('useMyActiveConversations', () => {
  it('fetches distinct post_ids from my comments, then open active posts', async () => {
    const { commentsChain, postsChain } = mockTwoStep({
      commentsResponse: {
        data: [{ post_id: 'p1' }, { post_id: 'p2' }, { post_id: 'p1' }], // dup p1
        error: null,
      },
      postsResponse: {
        data: [
          { id: 'p1', is_full: false },
          { id: 'p2', is_full: false },
        ],
        error: null,
      },
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyActiveConversations(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(commentsChain.eq).toHaveBeenCalledWith('author_id', 'me-1');
    expect(postsChain.in).toHaveBeenCalledWith('id', ['p1', 'p2']); // deduped
    expect(postsChain.eq).toHaveBeenCalledWith('is_full', false);
    expect(postsChain.eq).toHaveBeenCalledWith('status', 'active');
    expect(postsChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toHaveLength(2);
  });

  it('short-circuits to empty when the user has no comments', async () => {
    const { postsChain } = mockTwoStep({
      commentsResponse: { data: [], error: null },
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyActiveConversations(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    // Second-step query is never sent when there are no post_ids.
    expect(postsChain.in).not.toHaveBeenCalled();
  });

  it('does not call supabase when there is no session', async () => {
    useAuthStore.setState({ session: null, profile: null, isLoading: false });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyActiveConversations(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock; reference, not invocation
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('surfaces a comments-step error', async () => {
    mockTwoStep({
      commentsResponse: { data: null, error: { message: 'comments down' } },
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyActiveConversations(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('comments down');
  });

  it('surfaces a posts-step error', async () => {
    mockTwoStep({
      commentsResponse: { data: [{ post_id: 'p1' }], error: null },
      postsResponse: { data: null, error: { message: 'posts down' } },
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyActiveConversations(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('posts down');
  });
});
