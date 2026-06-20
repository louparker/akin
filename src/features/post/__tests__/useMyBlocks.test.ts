import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useMyBlocks } from '../api/useMyBlocks';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

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
    profile: { id: 'user-1', anonymous_identifier: 'CrimsonFox42' } as never,
    isLoading: false,
  });
  mockEq.mockResolvedValue({ data: [], error: null });
  mockOrder.mockReturnValue({ eq: mockEq });
  mockSelect.mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
  (supabase.from as jest.Mock).mockImplementation(mockFrom);
});

describe('useMyBlocks', () => {
  it('queries the blocks table filtered by blocker_id', async () => {
    const { result } = renderHook(() => useMyBlocks(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('blocks');
    expect(mockSelect).toHaveBeenCalledWith('blocked_id, blocked_identifier, created_at');
    expect(mockEq).toHaveBeenCalledWith('blocker_id', 'user-1');
  });

  it('returns an empty array when no blocks exist', async () => {
    const { result } = renderHook(() => useMyBlocks(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('returns the block rows when blocks exist', async () => {
    const blocks = [
      { blocked_id: 'u2', blocked_identifier: 'BlueFox11', created_at: '2026-01-01' },
      { blocked_id: 'u3', blocked_identifier: 'GreenOwl22', created_at: '2026-01-02' },
    ];
    mockEq.mockResolvedValue({ data: blocks, error: null });

    const { result } = renderHook(() => useMyBlocks(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(blocks);
  });

  it('returns undefined data when not authenticated', () => {
    useAuthStore.setState({ session: null, profile: null, isLoading: false });
    const { result } = renderHook(() => useMyBlocks(), { wrapper: makeWrapper() });
    // Query is disabled when no session — stays pending.
    expect(result.current.data).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
