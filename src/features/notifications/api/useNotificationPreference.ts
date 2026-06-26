import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { registerCurrentDeviceForPush, PushPermissionError } from './pushRegistration';

export { PushPermissionError };

export interface NotificationPreference {
  pushReplies: boolean;
}

const DEFAULT_PREF: NotificationPreference = { pushReplies: false };

function notificationPreferenceKey(userId: string | undefined) {
  return ['notification-preference', userId ?? 'anonymous'] as const;
}

export function useNotificationPreference() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;

  return useQuery({
    queryKey: notificationPreferenceKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<NotificationPreference> => {
      if (!userId) return DEFAULT_PREF;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('push_replies')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return { pushReplies: data?.push_replies ?? false };
    },
    initialData: DEFAULT_PREF,
  });
}

export function useSetPushRepliesPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { session } = useAuthStore.getState();
      if (!session) throw new Error('Not authenticated');

      if (enabled) {
        await registerCurrentDeviceForPush(session.user.id);
      }

      const { error } = await supabase.from('notification_preferences').upsert(
        {
          user_id: session.user.id,
          push_replies: enabled,
        },
        { onConflict: 'user_id' },
      );

      if (error) throw new Error(error.message);
      return { userId: session.user.id, pushReplies: enabled };
    },
    onSuccess: ({ userId, pushReplies }) => {
      queryClient.setQueryData(notificationPreferenceKey(userId), { pushReplies });
    },
  });
}
