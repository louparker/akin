import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuditLog } from '../api/useAuditLog';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

const mockedFrom = (supabase as unknown as { from: jest.Mock }).from;

const ENTRY = {
  id: 1,
  actor_id: 'mod-1',
  action: 'report.dismissed',
  target_type: 'post',
  target_id: 'p-1',
  metadata: {},
  created_at: '2026-06-01T10:00:00Z',
};

function makeChain(result: { data: unknown; error: unknown; count?: number }) {
  return {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue(result),
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

describe('useAuditLog', () => {
  it('returns paginated audit entries newest first', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: [ENTRY], error: null, count: 1 }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAuditLog({ page: 0 }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.entries).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });

  it('returns empty entries when audit log is empty', async () => {
    mockedFrom.mockReturnValue(makeChain({ data: [], error: null, count: 0 }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAuditLog({ page: 0 }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.entries).toHaveLength(0);
  });
});
