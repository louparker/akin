import { act, renderHook } from '@testing-library/react-native';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import type { Profile } from '../store/useAuthStore';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      verifyOtp: jest.fn(),
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
    functions: {
      invoke: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

const mockSession = (userId = 'user-1'): Session =>
  // Cast needed: Session has many required fields; we only provide the ones under test.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  ({
    user: { id: userId } as User,
    access_token: 'tok',
    refresh_token: 'ref',
    expires_in: 3600,
    token_type: 'bearer',
  }) as unknown as Session;

const mockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  user_id: 'user-1',
  anonymous_identifier: 'CrimsonFox42',
  language: 'en',
  age_verified_at: '2026-01-01T00:00:00Z',
  active_post_count: 0,
  strike_count: 0,
  status: 'active',
  suspended_until: null,
  onboarded_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

beforeEach(() => {
  useAuthStore.setState({
    session: null,
    profile: null,
    isLoading: false,
    error: null,
  });
  jest.clearAllMocks();
});

// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedFunctionsInvoke = jest.mocked(supabase.functions.invoke);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedSignUp = jest.mocked(supabase.auth.signUp);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedSignIn = jest.mocked(supabase.auth.signInWithPassword);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedResetPassword = jest.mocked(supabase.auth.resetPasswordForEmail);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedUpdateUser = jest.mocked(supabase.auth.updateUser);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedVerifyOtp = jest.mocked(supabase.auth.verifyOtp);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedFrom = jest.mocked(supabase.from);

function mockProfileFetchOnce(profile: Profile | null) {
  mockedFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValueOnce({ data: profile, error: profile ? null : 'not found' }),
    update: jest.fn().mockReturnThis(),
  });
}

describe('useAuthStore', () => {
  describe('signUp', () => {
    it('sets isLoading true then false around the call', async () => {
      let resolveSignUp!: (value: { error: null; data: { user: null; session: null } }) => void;
      mockedSignUp.mockReturnValueOnce(
        new Promise<{ error: null; data: { user: null; session: null } }>((resolve) => {
          resolveSignUp = resolve;
        }),
      );

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { signUp } = result.current;

      let signUpPromise: Promise<void>;
      act(() => {
        signUpPromise = signUp('test@example.com', 'password123');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ error: null, data: { user: null, session: null } });
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
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { signUp } = result.current;

      await act(async () => {
        await signUp('taken@example.com', 'password123');
      });

      expect(result.current.error).toBe('Email already registered');
      expect(result.current.isLoading).toBe(false);
    });

    it('passes age_verified_at and language in user metadata', async () => {
      mockedSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { signUp } = result.current;

      await act(async () => {
        await signUp('new@example.com', 'password123', 'en');
      });

      expect(mockedSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          options: expect.objectContaining({
            data: expect.objectContaining({
              age_verified_at: expect.any(String),
              language: 'en',
            }),
          }),
        }),
      );
    });
  });

  describe('verifyEmailOtp', () => {
    it('calls verifyOtp with type signup and the entered code', async () => {
      const session = mockSession();
      mockedVerifyOtp.mockResolvedValueOnce({
        data: { user: session.user, session },
        error: null,
      });
      mockProfileFetchOnce(mockProfile({ onboarded_at: null, anonymous_identifier: 'pending_1' }));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.verifyEmailOtp('new@example.com', '12345678');
      });

      expect(mockedVerifyOtp).toHaveBeenCalledWith({
        email: 'new@example.com',
        token: '12345678',
        type: 'signup',
      });
    });

    it('routes to identifier reveal after a fresh signup confirmation', async () => {
      const session = mockSession();
      mockedVerifyOtp.mockResolvedValueOnce({
        data: { user: session.user, session },
        error: null,
      });
      mockProfileFetchOnce(mockProfile({ onboarded_at: null, anonymous_identifier: 'pending_1' }));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.verifyEmailOtp('new@example.com', '12345678');
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(router).replace).toHaveBeenCalledWith('/(auth)/identifier');
      expect(result.current.session).toEqual(session);
    });

    it('sets error and does not route on an invalid/expired code', async () => {
      mockedVerifyOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Token has expired or is invalid', status: 403 } as AuthError,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.verifyEmailOtp('new@example.com', '00000000');
      });

      expect(result.current.error).toBe('Token has expired or is invalid');
      expect(result.current.isLoading).toBe(false);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(router).replace).not.toHaveBeenCalled();
    });
  });

  describe('confirmFromDeepLink', () => {
    it('verifies the token_hash and routes on success', async () => {
      const session = mockSession();
      mockedVerifyOtp.mockResolvedValueOnce({
        data: { user: session.user, session },
        error: null,
      });
      mockProfileFetchOnce(mockProfile({ onboarded_at: null, anonymous_identifier: 'pending_1' }));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.confirmFromDeepLink('hash-abc', 'signup');
      });

      expect(mockedVerifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-abc', type: 'signup' });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(router).replace).toHaveBeenCalledWith('/(auth)/identifier');
    });

    it('returns an error result on an expired link without throwing', async () => {
      mockedVerifyOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'expired', status: 403 } as AuthError,
      });

      const { result } = renderHook(() => useAuthStore());

      let outcome: boolean | undefined;
      await act(async () => {
        outcome = await result.current.confirmFromDeepLink('hash-bad', 'signup');
      });

      expect(outcome).toBe(false);
      expect(result.current.error).toBe('expired');
    });
  });

  describe('refreshProfile', () => {
    it('refetches the profile and updates active_post_count in the store', async () => {
      useAuthStore.setState({
        session: mockSession(),
        profile: mockProfile({ active_post_count: 1 }),
      });
      mockProfileFetchOnce(mockProfile({ active_post_count: 2 }));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(result.current.profile?.active_post_count).toBe(2);
    });

    it('does nothing when there is no session', async () => {
      useAuthStore.setState({ session: null, profile: null });
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(result.current.profile).toBeNull();
    });
  });

  describe('signIn', () => {
    it('sets error on invalid credentials', async () => {
      mockedSignIn.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 } as AuthError,
      });

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { signIn } = result.current;

      await act(async () => {
        await signIn('bad@example.com', 'wrongpassword');
      });

      expect(result.current.error).toBe('Invalid login credentials');
      expect(result.current.isLoading).toBe(false);
    });

    it('routes to feed when onboarded and active', async () => {
      const session = mockSession();

      mockedSignIn.mockResolvedValueOnce({
        data: { user: session.user, session },
        error: null,
      });

      mockedFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({ data: mockProfile(), error: null }),
        update: jest.fn().mockReturnThis(),
      } as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { signIn } = result.current;

      await act(async () => {
        await signIn('ok@example.com', 'password123');
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(router).replace).toHaveBeenCalledWith('/(main)/feed');
    });

    it('routes to onboarding when identifier is resolved but onboarded_at is null', async () => {
      const session = mockSession();

      mockedSignIn.mockResolvedValueOnce({
        data: { user: session.user, session },
        error: null,
      });

      mockedFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValueOnce({ data: mockProfile({ onboarded_at: null }), error: null }),
        update: jest.fn().mockReturnThis(),
      } as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { signIn } = result.current;

      await act(async () => {
        await signIn('new@example.com', 'password123');
      });

      // Identifier already resolved → skip identifier screen, go straight to onboarding.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(router).replace).toHaveBeenCalledWith('/(auth)/onboarding');
    });

    it('routes to identifier reveal when identifier is pending and onboarded_at is null', async () => {
      const session = mockSession();

      mockedSignIn.mockResolvedValueOnce({
        data: { user: session.user, session },
        error: null,
      });

      mockedFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockProfile({ onboarded_at: null, anonymous_identifier: 'pending_001' }),
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      } as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { signIn } = result.current;

      await act(async () => {
        await signIn('pending@example.com', 'password123');
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(router).replace).toHaveBeenCalledWith('/(auth)/identifier');
    });

    it('does not navigate when the profile is suspended (root layout handles render)', async () => {
      const session = mockSession();

      mockedSignIn.mockResolvedValueOnce({
        data: { user: session.user, session },
        error: null,
      });

      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      mockedFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockProfile({ status: 'suspended', suspended_until: future }),
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      } as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { signIn } = result.current;

      await act(async () => {
        await signIn('suspended@example.com', 'password123');
      });

      // The root layout swaps <Slot /> for <SuspendedScreen /> based on
      // profile.status — navigation would race against that swap and bounce.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(router).replace).not.toHaveBeenCalled();
    });

    it('routes to feed when suspension has expired (status stale, timestamp in past)', async () => {
      const session = mockSession();

      mockedSignIn.mockResolvedValueOnce({
        data: { user: session.user, session },
        error: null,
      });

      const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      mockedFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockProfile({ status: 'suspended', suspended_until: past }),
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      } as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { signIn } = result.current;

      await act(async () => {
        await signIn('expired@example.com', 'password123');
      });

      // The boot guard in app/_layout.tsx treats this as "not suspended" because
      // suspended_until < now(). routeAfterSignIn MUST match: fall through and
      // route normally rather than stranding the user with no navigation.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(router).replace).toHaveBeenCalledWith('/(main)/feed');
    });

    it('does not navigate when the profile is banned (root layout handles render)', async () => {
      const session = mockSession();

      mockedSignIn.mockResolvedValueOnce({
        data: { user: session.user, session },
        error: null,
      });

      mockedFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockProfile({ status: 'banned' }),
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      } as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useAuthStore());
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { signIn } = result.current;

      await act(async () => {
        await signIn('banned@example.com', 'password123');
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(router).replace).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('calls resetPasswordForEmail with the given email', async () => {
      mockedResetPassword.mockResolvedValueOnce({ data: {}, error: null });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.requestPasswordReset('user@example.com');
      });

      expect(mockedResetPassword).toHaveBeenCalledWith('user@example.com', expect.any(Object));
      expect(result.current.error).toBeNull();
    });

    it('does not expose error on failure (generic response)', async () => {
      mockedResetPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'rate limited', status: 429 } as AuthError,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.requestPasswordReset('noone@example.com');
      });

      // Deliberately no error exposed — we never confirm whether an email exists
      expect(result.current.error).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('calls updateUser with the new password', async () => {
      mockedUpdateUser.mockResolvedValueOnce({ data: { user: {} as User }, error: null });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.updatePassword('NewPass123!');
      });

      expect(mockedUpdateUser).toHaveBeenCalledWith({ password: 'NewPass123!' });
      expect(result.current.error).toBeNull();
    });

    it('sets error when updateUser fails', async () => {
      mockedUpdateUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Token expired', status: 401 } as AuthError,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.updatePassword('NewPass123!');
      });

      expect(result.current.error).toBe('Token expired');
    });
  });

  describe('generateIdentifier', () => {
    it('invokes the edge function with the session userId', async () => {
      const session = mockSession('user-abc');
      useAuthStore.setState({
        session,
        profile: mockProfile({ anonymous_identifier: 'pending_001' }),
        isLoading: false,
        error: null,
      });

      mockedFunctionsInvoke.mockResolvedValueOnce({
        data: { identifier: 'CrimsonFox42' },
        error: null,
      });
      mockedFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockProfile({ anonymous_identifier: 'CrimsonFox42' }),
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      } as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useAuthStore());
      await act(async () => {
        await result.current.generateIdentifier();
      });

      expect(mockedFunctionsInvoke).toHaveBeenCalledWith('generate-identifier', {
        body: { userId: 'user-abc' },
      });
      expect(result.current.profile?.anonymous_identifier).toBe('CrimsonFox42');
      expect(result.current.isLoading).toBe(false);
    });

    it('sets error and leaves profile unchanged when edge function fails', async () => {
      const session = mockSession();
      useAuthStore.setState({
        session,
        profile: mockProfile({ anonymous_identifier: 'pending_001' }),
        isLoading: false,
        error: null,
      });

      mockedFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: new Error('userId is required'),
      });

      const { result } = renderHook(() => useAuthStore());
      await act(async () => {
        await result.current.generateIdentifier();
      });

      expect(result.current.error).toBe('userId is required');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.profile?.anonymous_identifier).toBe('pending_001');
    });

    it('does nothing when there is no session', async () => {
      useAuthStore.setState({ session: null, profile: null, isLoading: false, error: null });

      const { result } = renderHook(() => useAuthStore());
      await act(async () => {
        await result.current.generateIdentifier();
      });

      expect(mockedFunctionsInvoke).not.toHaveBeenCalled();
    });
  });

  describe('completeOnboarding', () => {
    it('writes onboarded_at to profiles and routes to feed', async () => {
      const session = mockSession();

      useAuthStore.setState({
        session,
        profile: mockProfile({ onboarded_at: null }),
        isLoading: false,
        error: null,
      });

      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockResolvedValueOnce({ error: null });
      mockedFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        single: jest.fn(),
        update: updateMock,
      } as ReturnType<typeof supabase.from>);

      // Second call for fetchProfile after update
      mockedFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockProfile({ onboarded_at: '2026-01-01' }),
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      } as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.completeOnboarding();
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(router).replace).toHaveBeenCalledWith('/(main)/feed');
    });
  });
});
