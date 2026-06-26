import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import {
  disablePushTokensForUser,
  PushPermissionError,
  registerCurrentDeviceForPush,
} from '../pushRegistration';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 'default' },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'project-123' } } },
  easConfig: { projectId: 'project-123' },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const mockedNotifications = jest.mocked(Notifications);
// eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock; reference, not invocation
const mockedFrom = jest.mocked(supabase.from);
const originalPlatformOS = Platform.OS;

function mockUpsert(result: { error: { message: string } | null } = { error: null }) {
  const chain = { upsert: jest.fn().mockResolvedValue(result) };
  mockedFrom.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  mockedNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
    data: 'ExpoPushToken[token-1]',
  } as never);
});

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
  jest.restoreAllMocks();
});

describe('registerCurrentDeviceForPush', () => {
  it('stores an Expo push token for the current user', async () => {
    const chain = mockUpsert();

    await expect(registerCurrentDeviceForPush('user-1')).resolves.toBe('ExpoPushToken[token-1]');

    expect(mockedNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: 'project-123',
    });
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        expo_push_token: 'ExpoPushToken[token-1]',
        platform: 'ios',
        enabled: true,
      }),
      { onConflict: 'user_id,expo_push_token' },
    );
  });

  it('creates the Android notification channel before requesting the token', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    mockUpsert();

    await registerCurrentDeviceForPush('user-1');

    expect(mockedNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'conversation-replies',
      expect.objectContaining({
        name: 'Conversation replies',
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
    );
  });

  it('throws PushPermissionError when notification permission is denied', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
    mockUpsert();

    await expect(registerCurrentDeviceForPush('user-1')).rejects.toBeInstanceOf(
      PushPermissionError,
    );
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it('throws when the Expo project id is missing', async () => {
    const originalExpoConfig = Constants.expoConfig;
    const originalEasConfig = Constants.easConfig;
    Object.defineProperty(Constants, 'expoConfig', { configurable: true, value: {} });
    Object.defineProperty(Constants, 'easConfig', { configurable: true, value: {} });
    mockUpsert();

    await expect(registerCurrentDeviceForPush('user-1')).rejects.toThrow('Project ID not found');

    Object.defineProperty(Constants, 'expoConfig', {
      configurable: true,
      value: originalExpoConfig,
    });
    Object.defineProperty(Constants, 'easConfig', { configurable: true, value: originalEasConfig });
  });
});

describe('disablePushTokensForUser', () => {
  it('marks the user push tokens disabled', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ update });

    await disablePushTokensForUser('user-1');

    expect(mockedFrom).toHaveBeenCalledWith('push_tokens');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});
