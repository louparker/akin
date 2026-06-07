import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useModerateReport, ModerateReportError } from '../api/useModerateReport';

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

beforeEach(() => jest.clearAllMocks());

describe('useModerateReport', () => {
  it('calls moderate_report RPC with correct args and invalidates the queue', async () => {
    mockedRpc.mockResolvedValue({ data: null, error: null });
    const { client, Wrapper } = makeWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useModerateReport(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        reportId: 'r-1',
        action: 'dismiss',
        reason: 'Not a violation.',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedRpc).toHaveBeenCalledWith('moderate_report', {
      p_report_id: 'r-1',
      p_action: 'dismiss',
      p_reason: 'Not a violation.',
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['moderation', 'queue'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['moderation', 'audit'] });
  });

  it('throws ModerateReportError no_reason when reason is empty', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useModerateReport(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ reportId: 'r-1', action: 'dismiss', reason: '   ' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ModerateReportError);
    expect((result.current.error as ModerateReportError).kind).toBe('no_reason');
  });

  it('throws ModerateReportError forbidden on P0401', async () => {
    mockedRpc.mockResolvedValue({ data: null, error: { code: 'P0401', message: 'FORBIDDEN' } });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useModerateReport(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ reportId: 'r-1', action: 'dismiss', reason: 'ok' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ModerateReportError).kind).toBe('forbidden');
  });
});
