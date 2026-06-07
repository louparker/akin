import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useIsModerator } from '../api/useIsModerator';

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

describe('useIsModerator', () => {
  it('returns false for non-moderator users', async () => {
    mockedRpc.mockResolvedValue({ data: false, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIsModerator(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it('returns true for moderator users', async () => {
    mockedRpc.mockResolvedValue({ data: true, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIsModerator(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });
});
