import * as SentryMock from '@sentry/react-native';
import { initSentry } from '@/lib/sentry';

// The Jest moduleNameMapper already redirects @sentry/react-native to our stub.
// All named exports on SentryMock are jest.fn()s — we can assert on them directly.

const sentryInit = SentryMock.init as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('initSentry', () => {
  it('calls Sentry.init with the DSN from env', () => {
    initSentry({ dsn: 'https://fake@sentry.io/123', appEnv: 'development' });
    expect(sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://fake@sentry.io/123' }),
    );
  });

  it('does not call Sentry.init when DSN is empty', () => {
    initSentry({ dsn: '', appEnv: 'development' });
    expect(sentryInit).not.toHaveBeenCalled();
  });

  it('sets tracesSampleRate to 0.1 in production', () => {
    initSentry({ dsn: 'https://fake@sentry.io/123', appEnv: 'production' });
    expect(sentryInit).toHaveBeenCalledWith(expect.objectContaining({ tracesSampleRate: 0.1 }));
  });

  it('sets tracesSampleRate to 1.0 in development', () => {
    initSentry({ dsn: 'https://fake@sentry.io/123', appEnv: 'development' });
    expect(sentryInit).toHaveBeenCalledWith(expect.objectContaining({ tracesSampleRate: 1.0 }));
  });

  describe('beforeSend PII scrubbing', () => {
    function getBeforeSend() {
      initSentry({ dsn: 'https://fake@sentry.io/123', appEnv: 'development' });
      const [callArg] = sentryInit.mock.calls[0] as [
        { beforeSend: (event: Record<string, unknown>) => Record<string, unknown> },
      ];
      return callArg.beforeSend;
    }

    it('strips email from event.extra', () => {
      const beforeSend = getBeforeSend();
      const result = beforeSend({ extra: { email: 'user@example.com', action: 'login' } });
      expect((result.extra as Record<string, unknown>).email).toBe('[redacted]');
      expect((result.extra as Record<string, unknown>).action).toBe('login');
    });

    it('strips ip from event.extra', () => {
      const beforeSend = getBeforeSend();
      const result = beforeSend({ extra: { ip: '192.168.1.1', count: 3 } });
      expect((result.extra as Record<string, unknown>).ip).toBe('[redacted]');
    });

    it('strips body from event.extra', () => {
      const beforeSend = getBeforeSend();
      const result = beforeSend({ extra: { body: 'private post content' } });
      expect((result.extra as Record<string, unknown>).body).toBe('[redacted]');
    });

    it('passes through safe keys unchanged', () => {
      const beforeSend = getBeforeSend();
      const result = beforeSend({ extra: { errorCode: 'ERR-1A2B', category: 'vent_space' } });
      expect((result.extra as Record<string, unknown>).errorCode).toBe('ERR-1A2B');
    });

    it('returns the event unchanged when extra is absent', () => {
      const beforeSend = getBeforeSend();
      const event = { message: 'oops', level: 'error' };
      expect(beforeSend(event)).toEqual(event);
    });
  });
});
