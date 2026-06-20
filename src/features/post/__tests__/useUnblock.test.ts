import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useUnblock } from '../api/useUnblock';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockEqBlocker = jest.fn();
const mockEqBlocked = jest.fn();
const mockDelete = jest.fn();
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
  mockEqBlocked.mockResolvedValue({ error: null });
  mockEqBlocker.mockReturnValue({ eq: mockEqBlocked });
  mockDelete.mockReturnValue({ eq: mockEqBlocker });
  mockFrom.mockReturnValue({ delete: mockDelete });
  (supabase.from as jest.Mock).mockImplementation(mockFrom);
});

describe('useUnblock', () => {
  it('calls supabase delete with blocker_id and blocked_id', async () => {
    const { result } = renderHook(() => useUnblock(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync('u2');
    });

    expect(mockFrom).toHaveBeenCalledWith('blocks');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEqBlocker).toHaveBeenCalledWith('blocker_id', 'user-1');
    expect(mockEqBlocked).toHaveBeenCalledWith('blocked_id', 'u2');
  });

  it('throws when not authenticated', async () => {
    useAuthStore.setState({ session: null, profile: null, isLoading: false });
    const { result } = renderHook(() => useUnblock(), { wrapper: makeWrapper() });

    await expect(result.current.mutateAsync('u2')).rejects.toThrow('Not authenticated');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
