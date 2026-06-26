import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
});

export function getNotificationPostId(notification: Notifications.Notification): string | null {
  const url = notification.request.content.data?.url;
  const prefix = '/(main)/post/';

  if (typeof url !== 'string' || !url.startsWith(prefix)) {
    return null;
  }

  const postId = url.slice(prefix.length);
  return postId.length > 0 ? postId : null;
}

export function useNotificationObserver() {
  useEffect(() => {
    function redirect(notification: Notifications.Notification) {
      const postId = getNotificationPostId(notification);
      if (postId) {
        router.push({ pathname: '/(main)/post/[id]', params: { id: postId } });
      }
    }

    const response = Notifications.getLastNotificationResponse();
    if (response?.notification) {
      redirect(response.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((event) => {
      redirect(event.notification);
    });

    return () => subscription.remove();
  }, []);
}
