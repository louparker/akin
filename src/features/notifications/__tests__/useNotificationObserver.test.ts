import { getNotificationPostId } from '../useNotificationObserver';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

function notificationWithUrl(url: unknown) {
  return {
    request: {
      content: {
        data: { url },
      },
    },
  } as never;
}

describe('getNotificationPostId', () => {
  it('returns post ids from notification payloads', () => {
    expect(getNotificationPostId(notificationWithUrl('/(main)/post/post-1'))).toBe('post-1');
  });

  it('ignores non-string URLs', () => {
    expect(getNotificationPostId(notificationWithUrl(42))).toBeNull();
  });

  it('ignores URLs outside the main post route', () => {
    expect(getNotificationPostId(notificationWithUrl('/(moderator)/queue'))).toBeNull();
  });
});
