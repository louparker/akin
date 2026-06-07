import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useModeratorQueue } from '../api/useModeratorQueue';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

const mockedFrom = (supabase as unknown as { from: jest.Mock }).from;

const OPEN_REPORT = {
  id: 'r1',
  reporter_id: 'u1',
  target_type: 'post',
  target_id: 'p1',
  reason: 'harassment',
  notes: null,
  status: 'open',
  created_at: '2026-06-01T10:00:00Z',
};

function makeSelectChain(result: { data: unknown; error: unknown }) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(result),
  };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    Wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('useModeratorQueue', () => {
  it('returns open reports sorted by age', async () => {
    mockedFrom.mockReturnValue(makeSelectChain({ data: [OPEN_REPORT], error: null }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useModeratorQueue(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect((result.current.data ?? [])[0]?.id).toBe('r1');
  });

  it('filters by reason when filter is provided', async () => {
    const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const chainWithOrder = { order: orderMock };
    const inMock = jest.fn().mockReturnValue(chainWithOrder);
    mockedFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: inMock,
      order: orderMock,
    });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useModeratorQueue({ reasonFilter: 'harassment' }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // in() is called before order() in the implementation
    expect(inMock).toHaveBeenCalledWith('reason', ['harassment']);
    expect(orderMock).toHaveBeenCalled();
  });

  it('returns empty array when no open reports exist', async () => {
    mockedFrom.mockReturnValue(makeSelectChain({ data: [], error: null }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useModeratorQueue(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });
});
