import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const CHANNEL_ID = 'conversation-replies';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readProjectId(value: unknown): string | null {
  const record = asRecord(value);
  const projectId = record?.projectId;
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null;
}

export class PushPermissionError extends Error {
  constructor() {
    super('Push notification permission was not granted.');
    this.name = 'PushPermissionError';
  }
}

function getProjectId(): string {
  const extra = asRecord(Constants.expoConfig)?.extra;
  const projectId = readProjectId(asRecord(extra)?.eas) ?? readProjectId(Constants.easConfig);

  if (!projectId) {
    throw new Error('Project ID not found');
  }

  return projectId;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Conversation replies',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 160, 120, 160],
    lightColor: '#2C4D55',
  });
}

export async function registerCurrentDeviceForPush(userId: string): Promise<string> {
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
    throw new PushPermissionError();
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId: getProjectId() })).data;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const now = new Date().toISOString();

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform,
      enabled: true,
      last_seen_at: now,
    },
    { onConflict: 'user_id,expo_push_token' },
  );

  if (error) {
    throw new Error(error.message);
  }

  return token;
}

export async function disablePushTokensForUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .update({ enabled: false, last_seen_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    logger.warn('push token disable failed', { action: 'disablePushTokensForUser' });
  }
}
