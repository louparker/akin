// Mutation hook that wires the Settings language toggle to:
//   1. The local useLocaleStore (always — covers all three options).
//   2. The profiles.language column (only for explicit 'sv' / 'en' — keeps the
//      column meaning "last explicit choice" stable across devices).

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLocaleStore } from '../store/useLocaleStore';
import { useLanguagePreference } from '../api/useLanguagePreference';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

const mockUpdate = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom: jest.Mock = jest.fn((_table: string) => ({ update: mockUpdate, eq: mockEq }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string): unknown => mockFrom(table) as unknown,
  },
}));

jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ session: { user: { id: 'user-1' } } }),
  },
}));

beforeEach(() => {
  useLocaleStore.setState({ preference: 'system' });
  mockUpdate.mockClear().mockReturnThis();
  mockEq.mockClear().mockResolvedValue({ data: null, error: null });
  mockFrom.mockClear();
  mockFrom.mockImplementation(() => ({ update: mockUpdate, eq: mockEq }));
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useLanguagePreference', () => {
  it('returns the current preference from the store', () => {
    useLocaleStore.setState({ preference: 'en' });
    const { result } = renderHook(() => useLanguagePreference(), { wrapper });
    expect(result.current.preference).toBe('en');
  });

  it('setting "en" updates the store and writes language to profiles', async () => {
    const { result } = renderHook(() => useLanguagePreference(), { wrapper });
    await act(async () => {
      await result.current.setPreference('en');
    });

    expect(useLocaleStore.getState().preference).toBe('en');
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('profiles'));
    expect(mockUpdate).toHaveBeenCalledWith({ language: 'en' });
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('setting "sv" updates the store and writes language to profiles', async () => {
    const { result } = renderHook(() => useLanguagePreference(), { wrapper });
    await act(async () => {
      await result.current.setPreference('sv');
    });

    expect(useLocaleStore.getState().preference).toBe('sv');
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ language: 'sv' }));
  });

  it('setting "system" updates the store but does NOT touch profiles.language', async () => {
    useLocaleStore.setState({ preference: 'en' });
    const { result } = renderHook(() => useLanguagePreference(), { wrapper });

    await act(async () => {
      await result.current.setPreference('system');
    });

    expect(useLocaleStore.getState().preference).toBe('system');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
