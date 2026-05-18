/**
 * RootLayout routing decision tests.
 *
 * These tests cover the splash/routing logic added in Task 3.10:
 * 1. Splash shows for ≤ 3 seconds (mock timers)
 * 2. Valid session + profile.status !== 'banned' → Slot rendered (not BannedScreen) after loading
 * 3. No session → Slot rendered (not BannedScreen) after loading
 * 4. profile.status === 'banned' → BannedScreen shown (not the main app)
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { SplashScreen } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/features/auth/store/useAuthStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
// Require the layout once at module scope (after all mocks are in place).
// resetModules per-test is avoided because it creates a second React instance
// that breaks Zustand hooks ("Cannot read properties of null reading 'useCallback'").
import RootLayout from '../../../../app/_layout';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  Slot: () => null,
  SplashScreen: {
    preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
    hideAsync: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-font', () => ({
  useFonts: jest.fn().mockReturnValue([true, null]),
}));

jest.mock('@/features/auth/store/useAuthStore', () => {
  // Re-export the real store but mock initialize() so it doesn't
  // overwrite the store state we set per-test.
  const actual = jest.requireActual<typeof import('@/features/auth/store/useAuthStore')>(
    '@/features/auth/store/useAuthStore',
  );
  const mockInitialize = jest.fn().mockResolvedValue(undefined);
  const mockSignOut = jest.fn().mockResolvedValue(undefined);
  // Patch the store actions
  actual.useAuthStore.setState({
    ...actual.useAuthStore.getState(),
    initialize: mockInitialize,
    signOut: mockSignOut,
  });
  return {
    ...actual,
  };
});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: 'SafeAreaProvider',
  SafeAreaView: 'SafeAreaView',
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({})),
  QueryClientProvider: 'QueryClientProvider',
}));

jest.mock('@/components/composed/ErrorBoundary', () => ({
  ErrorBoundary: 'ErrorBoundary',
}));

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('@/lib/i18n', () => ({
  t: (key: string) => key,
  locale: 'en',
}));

// react-native-reanimated is handled by jest.config.ts moduleNameMapper
// pointing to src/__mocks__/react-native-reanimated.ts — no jest.mock() needed.

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSession(): Session {
  return {
    access_token: 'tok',
    refresh_token: 'ref',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    user: {
      id: 'user-1',
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
      app_metadata: {},
      user_metadata: {},
    },
  } as unknown as Session;
}

function makeProfile(status: string = 'active'): Profile {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    anonymous_identifier: 'CrimsonFox42',
    status,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    onboarding_complete: true,
  } as unknown as Profile;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RootLayout — splash and routing decisions', () => {
  const originalConsoleError = console.error; // eslint-disable-line no-console

  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      profile: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Capture console.error so test failure messages reveal the real thrown error.
    // eslint-disable-next-line no-console
    console.error = (...args: unknown[]) => {
      originalConsoleError(...args);
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    // eslint-disable-next-line no-console
    console.error = originalConsoleError;
  });

  // ── Test 1: Splash ≤ 3 seconds ─────────────────────────────────────────────
  it('hides the splash within 3 seconds even if isLoading stays true', () => {
    // Keep isLoading = true so the session-resolved path never fires.
    useAuthStore.setState({ isLoading: true });

    const mockHideAsync = jest.mocked(SplashScreen.hideAsync);

    render(React.createElement(RootLayout));

    const callsBefore = mockHideAsync.mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // After 3s the hard-cap timeout must have triggered hideAsync at least once.
    expect(mockHideAsync.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  // ── Test 2: Valid session → no BannedScreen ─────────────────────────────────
  it('does not show BannedScreen when session exists and profile is not banned', async () => {
    useAuthStore.setState({
      session: makeSession(),
      profile: makeProfile('active'),
      isLoading: false,
    });

    render(React.createElement(RootLayout));
    // Flush pending state updates and promises (initialize, dismissSplash, etc.)
    await act(async () => {});

    expect(screen.queryByTestId('banned-screen')).toBeNull();
  });

  // ── Test 3: No session → no BannedScreen ────────────────────────────────────
  it('does not show BannedScreen when there is no session', async () => {
    useAuthStore.setState({
      session: null,
      profile: null,
      isLoading: false,
    });

    render(React.createElement(RootLayout));
    // Flush pending state updates and promises
    await act(async () => {});

    expect(screen.queryByTestId('banned-screen')).toBeNull();
  });

  // ── Test 4: Banned profile → BannedScreen ────────────────────────────────────
  it('shows BannedScreen when profile.status is banned', async () => {
    useAuthStore.setState({
      session: makeSession(),
      profile: makeProfile('banned'),
      isLoading: false,
    });

    render(React.createElement(RootLayout));
    // Flush pending state updates and promises
    await act(async () => {});

    expect(screen.getByTestId('banned-screen')).toBeTruthy();
  });
});
