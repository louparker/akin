import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useReport, ReportError } from '../api/useReport';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({ session: { user: { id: 'user-1' } } }),
}));
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

beforeEach(() => jest.clearAllMocks());

describe('useReport', () => {
  it('succeeds and inserts a report row', async () => {
    mockedFrom.mockReturnValue(makeInsertChain({ error: null }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useReport(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ target_id: 'post-1', target_type: 'post', reason: 'harassment' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('fires report_filed analytics event on success', async () => {
    const { track } = jest.requireMock<{ track: jest.Mock }>('@/lib/analytics');
    mockedFrom.mockReturnValue(makeInsertChain({ error: null }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useReport(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ target_id: 'post-1', target_type: 'post', reason: 'hate' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(track).toHaveBeenCalledWith('report_filed', { reason: 'hate' });
  });

  it('passes notes to the insert when provided', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockedFrom.mockReturnValue({ insert: insertMock });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useReport(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        target_id: 'post-1',
        target_type: 'post',
        reason: 'other',
        notes: 'This is detailed context.',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'This is detailed context.' }),
    );
  });

  it('throws ReportError rate_limit on P0030', async () => {
    mockedFrom.mockReturnValue(
      makeInsertChain({ error: { code: 'P0030', message: 'REPORT_RATE_LIMIT' } }),
    );
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useReport(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ target_id: 'post-1', target_type: 'post', reason: 'spam' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ReportError);
    expect((result.current.error as ReportError).kind).toBe('rate_limit');
  });

  it('throws ReportError unknown on other DB errors', async () => {
    mockedFrom.mockReturnValue(
      makeInsertChain({ error: { code: 'XXXXX', message: 'some other error' } }),
    );
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useReport(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ target_id: 'post-1', target_type: 'post', reason: 'spam' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ReportError).kind).toBe('unknown');
  });
});
