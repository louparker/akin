import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useModerateReport, ModerateReportError } from '../api/useModerateReport';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

const mockedRpc = (supabase as unknown as { rpc: jest.Mock }).rpc;
const mockedInvoke = (supabase as unknown as { functions: { invoke: jest.Mock } }).functions.invoke;

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
    mockedInvoke.mockResolvedValue({ data: { sent: false }, error: null });
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

  describe('notify-moderation invocation', () => {
    it.each(['warn', 'suspend', 'ban'] as const)(
      'invokes notify-moderation after %s action succeeds',
      async (action) => {
        mockedRpc.mockResolvedValue({ data: null, error: null });
        mockedInvoke.mockResolvedValue({ data: { sent: true }, error: null });
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useModerateReport(), { wrapper: Wrapper });

        act(() => {
          result.current.mutate({ reportId: 'r-1', action, reason: 'Violation.' });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mockedInvoke).toHaveBeenCalledWith('notify-moderation', {
          body: { reportId: 'r-1', action },
        });
      },
    );

    it.each(['dismiss', 'hide'] as const)(
      'does NOT invoke notify-moderation after %s action',
      async (action) => {
        mockedRpc.mockResolvedValue({ data: null, error: null });
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useModerateReport(), { wrapper: Wrapper });

        act(() => {
          result.current.mutate({ reportId: 'r-1', action, reason: 'ok' });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mockedInvoke).not.toHaveBeenCalledWith('notify-moderation', expect.anything());
      },
    );

    it('invokes report-csam after csam action succeeds', async () => {
      mockedRpc.mockResolvedValue({ data: null, error: null });
      mockedInvoke.mockResolvedValue({ data: { exported: true }, error: null });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useModerateReport(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ reportId: 'r-1', action: 'csam', reason: 'CSAM confirmed.' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedInvoke).toHaveBeenCalledWith('report-csam', {
        body: { reportId: 'r-1' },
      });
    });

    it('does not invoke report-csam for non-csam actions', async () => {
      mockedRpc.mockResolvedValue({ data: null, error: null });
      mockedInvoke.mockResolvedValue({ data: { sent: true }, error: null });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useModerateReport(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ reportId: 'r-1', action: 'ban', reason: 'Spam.' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedInvoke).not.toHaveBeenCalledWith('report-csam', expect.anything());
    });

    it('does not fail the mutation if notify-moderation invocation errors', async () => {
      mockedRpc.mockResolvedValue({ data: null, error: null });
      mockedInvoke.mockResolvedValue({ data: null, error: { message: 'Edge Function error' } });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useModerateReport(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ reportId: 'r-1', action: 'warn', reason: 'Violation.' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
