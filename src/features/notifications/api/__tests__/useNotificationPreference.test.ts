import { act, renderHook, waitFor } from '@testing-library/react-native';
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import {
  useNotificationPreference,
  useSetPushRepliesPreference,
} from '../useNotificationPreference';
import { registerCurrentDeviceForPush } from '../pushRegistration';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/features/auth/store/useAuthStore', () => {
  const useAuthStore = (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'user-1' } } });
  (useAuthStore as unknown as { getState: () => unknown }).getState = () => ({
    session: { user: { id: 'user-1' } },
  });
  return { useAuthStore };
});

jest.mock('../pushRegistration', () => ({
  registerCurrentDeviceForPush: jest.fn().mockResolvedValue('ExpoPushToken[token-1]'),
}));

// eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock; reference, not invocation
const mockedFrom = jest.mocked(supabase.from);
const mockedRegister = jest.mocked(registerCurrentDeviceForPush);
const queryClients: QueryClient[] = [];
const asyncScheduler = (callback: () => void) => {
  setTimeout(callback, 0);
};

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
      mutations: { retry: false },
    },
  });
  queryClients.push(client);

  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  };
}

beforeAll(() => {
  notifyManager.setScheduler((callback) => {
    callback();
  });
  notifyManager.setNotifyFunction((callback) => {
    act(callback);
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  for (const client of queryClients) {
    client.clear();
  }
  queryClients.length = 0;
});

afterAll(() => {
  notifyManager.setNotifyFunction((callback) => {
    callback();
  });
  notifyManager.setScheduler(asyncScheduler);
});

describe('useNotificationPreference', () => {
  it('defaults pushReplies to false when no preference row exists yet', async () => {
    mockedFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useNotificationPreference(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data?.pushReplies).toBe(false));
  });

  it('reads the stored pushReplies preference', async () => {
    mockedFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { push_replies: true },
        error: null,
      }),
    });
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useNotificationPreference(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data?.pushReplies).toBe(true));
  });
});

describe('useSetPushRepliesPreference', () => {
  it('registers the current device before enabling reply notifications', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockedFrom.mockReturnValue({ upsert });
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useSetPushRepliesPreference(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(true);
    });

    expect(mockedRegister).toHaveBeenCalledWith('user-1');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', push_replies: true }),
      { onConflict: 'user_id' },
    );
  });

  it('does not register a device when disabling reply notifications', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockedFrom.mockReturnValue({ upsert });
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useSetPushRepliesPreference(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(false);
    });

    expect(mockedRegister).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', push_replies: false }),
      { onConflict: 'user_id' },
    );
  });
});
