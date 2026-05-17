import { act, renderHook } from '@testing-library/react-native';
import type { AuthError } from '@supabase/supabase-js';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  },
}));

// expo-router is not available in Jest — stub navigate/replace
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

// Reset store state between tests
beforeEach(() => {
  useAuthStore.setState({
    session: null,
    profile: null,
    isLoading: false,
    error: null,
  });
  jest.clearAllMocks();
});

// eslint-disable-next-line @typescript-eslint/unbound-method -- supabase mock methods are jest.fn() closures, not this-bound
const mockedSignUp = jest.mocked(supabase.auth.signUp);
// eslint-disable-next-line @typescript-eslint/unbound-method -- supabase mock methods are jest.fn() closures, not this-bound
const mockedSignInWithPassword = jest.mocked(supabase.auth.signInWithPassword);

describe('useAuthStore', () => {
  describe('signUp', () => {
    it('sets isLoading true then false around the call', async () => {
      let resolveSignUp!: (value: { error: null }) => void;
      mockedSignUp.mockReturnValueOnce(
        new Promise<{ error: null }>((resolve) => {
          resolveSignUp = resolve;
        }) as ReturnType<typeof supabase.auth.signUp>,
      );

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Zustand actions are closures, not this-bound
      const { signUp } = result.current;

      let signUpPromise: Promise<void>;
      act(() => {
        signUpPromise = signUp('test@example.com', 'password123');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ error: null });
        await signUpPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets error on Supabase AuthApiError', async () => {
      mockedSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email already registered', status: 422 } as AuthError,
      });

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Zustand actions are closures, not this-bound
      const { signUp } = result.current;

      await act(async () => {
        await signUp('taken@example.com', 'password123');
      });

      expect(result.current.error).toBe('Email already registered');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('signIn', () => {
    it('sets error on invalid credentials', async () => {
      mockedSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 } as AuthError,
      });

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Zustand actions are closures, not this-bound
      const { signIn } = result.current;

      await act(async () => {
        await signIn('bad@example.com', 'wrongpassword');
      });

      expect(result.current.error).toBe('Invalid login credentials');
      expect(result.current.isLoading).toBe(false);
    });
  });
});
