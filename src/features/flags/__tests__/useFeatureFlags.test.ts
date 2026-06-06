import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useFeatureFlags, useFlag } from '../api/useFeatureFlags';
import { useFlagsStore } from '../store/useFlagsStore';
import { flagDefaults } from '../defaults';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

// Capture logger.error calls without hitting the real implementation.
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  scrub: (x: unknown) => x,
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

function makeChain(result: { data: unknown; error: unknown }) {
  return { select: jest.fn().mockResolvedValue(result) };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the store to defaults before each test.
  act(() => {
    useFlagsStore.setState({ flags: { ...flagDefaults } });
  });
});

describe('useFlag', () => {
  it('returns the default value when the store is at defaults', () => {
    const { result } = renderHook(() => useFlag('signups_open'));
    expect(result.current).toBe(true);
  });

  it('returns the updated value after the store is set', () => {
    act(() => {
      useFlagsStore.setState({
        flags: { signups_open: false, posting_open: true, realtime_open: true },
      });
    });
    const { result } = renderHook(() => useFlag('signups_open'));
    expect(result.current).toBe(false);
  });
});

describe('useFeatureFlags', () => {
  it('returns default when the API returns an empty array', async () => {
    (supabase.from as jest.Mock).mockReturnValue(makeChain({ data: [], error: null }));

    const { result } = renderHook(
      () => ({ ff: useFeatureFlags(), flag: useFlag('signups_open') }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.ff.isSuccess).toBe(true));
    expect(result.current.flag).toBe(true); // default
  });

  it('returns the value from the API when a row is present', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeChain({ data: [{ key: 'signups_open', value: false }], error: null }),
    );

    const { result } = renderHook(
      () => ({ ff: useFeatureFlags(), flag: useFlag('signups_open') }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.flag).toBe(false));
  });

  it('ignores unknown flag keys returned by the API', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeChain({
        data: [
          { key: 'signups_open', value: false },
          { key: 'unknown_flag', value: true }, // should be ignored
        ],
        error: null,
      }),
    );

    const { result } = renderHook(
      () => ({ ff: useFeatureFlags(), flag: useFlag('posting_open') }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.ff.isSuccess).toBe(true));
    // posting_open was not in the API response — should stay at default (true)
    expect(result.current.flag).toBe(true);
  });

  it('falls back to defaults and logs an error on fetch failure', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeChain({ data: null, error: new Error('DB error') }),
    );

    const { result } = renderHook(
      () => ({ ff: useFeatureFlags(), flag: useFlag('signups_open') }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.ff.isError).toBe(true));

    // Store stays at defaults
    expect(result.current.flag).toBe(true);
    // Error is logged
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith(
      'feature_flags_fetch_failed',
      expect.objectContaining({ reason: expect.any(String) }),
    );
  });

  it('falls back to defaults and logs an error on 5s timeout', async () => {
    jest.useFakeTimers();

    // Fetch promise never resolves — simulates a hung network request.
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue(new Promise(() => {})),
    });

    const { result } = renderHook(
      () => ({ ff: useFeatureFlags(), flag: useFlag('signups_open') }),
      { wrapper: makeWrapper() },
    );

    // Advance past the 5s timeout
    await act(async () => {
      jest.advanceTimersByTime(5_001);
      // Flush microtask queue so promises settle
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.ff.isError).toBe(true));

    // Store stays at defaults
    expect(result.current.flag).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith(
      'feature_flags_fetch_failed',
      expect.objectContaining({ reason: expect.any(String) }),
    );

    jest.useRealTimers();
  });

  it('refetches after 60 seconds', async () => {
    jest.useFakeTimers();

    const selectFn = jest.fn().mockResolvedValue({ data: [], error: null });
    (supabase.from as jest.Mock).mockReturnValue({ select: selectFn });

    renderHook(() => useFeatureFlags(), { wrapper: makeWrapper() });

    // Let the initial fetch complete
    await act(async () => {
      await Promise.resolve();
    });
    expect(selectFn).toHaveBeenCalledTimes(1);

    // Advance 60s to trigger the refetch
    await act(async () => {
      jest.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(selectFn).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
