import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useLocaleStore } from '@/features/locale/store/useLocaleStore';
import { useCreatePost, CreatePostError } from '../api/useCreatePost';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));

function mockInsertResult(result: {
  data: unknown;
  error: { code?: string; message: string } | null;
}) {
  const chain = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    session: { user: { id: 'user-1' } } as never,
    profile: {
      id: 'user-1',
      anonymous_identifier: 'CrimsonFox42',
    } as never,
    isLoading: false,
  });
  // Default to Swedish so the explicit-locale tests assert the override clearly.
  useLocaleStore.setState({ preference: 'sv' });
});

describe('useCreatePost', () => {
  it('inserts the post with author + identifier from auth store', async () => {
    const chain = mockInsertResult({
      data: { id: 'post-99' },
      error: null,
    });

    const { result } = renderHook(() => useCreatePost(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        title: 'Hello world',
        body: 'This is a post body.',
        category: 'vent_space',
      });
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock; reference, not invocation
    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Hello world',
        body: 'This is a post body.',
        category: 'vent_space',
        author_id: 'user-1',
        author_identifier: 'CrimsonFox42',
      }),
    );
  });

  it('writes the active locale as posts.language (en when preference="en")', async () => {
    useLocaleStore.setState({ preference: 'en' });
    const chain = mockInsertResult({ data: { id: 'p1' }, error: null });
    const { result } = renderHook(() => useCreatePost(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ title: 'T', body: 'B', category: 'vent_space' });
    });

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ language: 'en' }));
  });

  it('writes the active locale as posts.language (sv when preference="sv")', async () => {
    useLocaleStore.setState({ preference: 'sv' });
    const chain = mockInsertResult({ data: { id: 'p2' }, error: null });
    const { result } = renderHook(() => useCreatePost(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ title: 'T', body: 'B', category: 'vent_space' });
    });

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ language: 'sv' }));
  });

  it('returns the inserted post id on success', async () => {
    mockInsertResult({ data: { id: 'post-99' }, error: null });
    const { result } = renderHook(() => useCreatePost(), { wrapper: makeWrapper() });

    let returned: { id: string } | undefined;
    await act(async () => {
      returned = await result.current.mutateAsync({
        title: 'T',
        body: 'B',
        category: 'good_vibes',
      });
    });

    expect(returned).toEqual({ id: 'post-99' });
  });

  it('maps P0003 to USER_ACTIVE_LIMIT_REACHED', async () => {
    mockInsertResult({
      data: null,
      error: { code: 'P0003', message: 'USER_ACTIVE_LIMIT_REACHED' },
    });
    const { result } = renderHook(() => useCreatePost(), { wrapper: makeWrapper() });

    await expect(
      result.current.mutateAsync({ title: 'T', body: 'B', category: 'vent_space' }),
    ).rejects.toMatchObject({
      kind: 'active_limit',
      i18nKey: 'error.USER_ACTIVE_LIMIT_REACHED',
    });
  });

  it('maps P0010 to CONTENT_FILTER_HIT', async () => {
    mockInsertResult({
      data: null,
      error: { code: 'P0010', message: 'CONTENT_FILTER_HIT' },
    });
    const { result } = renderHook(() => useCreatePost(), { wrapper: makeWrapper() });

    await expect(
      result.current.mutateAsync({ title: 'T', body: 'B', category: 'vent_space' }),
    ).rejects.toMatchObject({
      kind: 'content_filter',
      i18nKey: 'error.CONTENT_FILTER_HIT',
    });
  });

  it('maps P0011 to CONTACT_INFO_NOT_ALLOWED', async () => {
    mockInsertResult({
      data: null,
      error: { code: 'P0011', message: 'CONTACT_INFO_NOT_ALLOWED' },
    });
    const { result } = renderHook(() => useCreatePost(), { wrapper: makeWrapper() });

    await expect(
      result.current.mutateAsync({ title: 'T', body: 'B', category: 'vent_space' }),
    ).rejects.toMatchObject({
      kind: 'contact_info',
      i18nKey: 'error.CONTACT_INFO_NOT_ALLOWED',
    });
  });

  it('maps unknown errors to error.generic', async () => {
    mockInsertResult({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });
    const { result } = renderHook(() => useCreatePost(), { wrapper: makeWrapper() });

    await expect(
      result.current.mutateAsync({ title: 'T', body: 'B', category: 'vent_space' }),
    ).rejects.toBeInstanceOf(CreatePostError);
  });

  it('rejects when not authenticated', async () => {
    useAuthStore.setState({ session: null, profile: null, isLoading: false });
    mockInsertResult({ data: null, error: null });
    const { result } = renderHook(() => useCreatePost(), { wrapper: makeWrapper() });

    await expect(
      result.current.mutateAsync({ title: 'T', body: 'B', category: 'vent_space' }),
    ).rejects.toBeInstanceOf(CreatePostError);

    // Should not even reach the DB.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock; reference, not invocation
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
