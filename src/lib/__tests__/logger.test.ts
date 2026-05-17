import { logger, scrub } from '@/lib/logger';

// ─── scrub ───────────────────────────────────────────────────────────────────

describe('scrub', () => {
  describe('PII key replacement', () => {
    it('redacts email', () => {
      expect(scrub({ email: 'test@example.com' })).toEqual({ email: '[redacted]' });
    });

    it('redacts password', () => {
      expect(scrub({ password: 'hunter2' })).toEqual({ password: '[redacted]' });
    });

    it('redacts token', () => {
      expect(scrub({ token: 'eyJhbGciOi...' })).toEqual({ token: '[redacted]' });
    });

    it('redacts authorization', () => {
      expect(scrub({ authorization: 'Bearer abc123' })).toEqual({
        authorization: '[redacted]',
      });
    });

    it('redacts ip', () => {
      expect(scrub({ ip: '192.168.1.1' })).toEqual({ ip: '[redacted]' });
    });

    it('redacts body', () => {
      expect(scrub({ body: 'private post content' })).toEqual({ body: '[redacted]' });
    });

    it('redacts title', () => {
      expect(scrub({ title: 'my vent post' })).toEqual({ title: '[redacted]' });
    });

    it('redacts notes', () => {
      expect(scrub({ notes: 'moderator private note' })).toEqual({ notes: '[redacted]' });
    });
  });

  describe('case-insensitivity', () => {
    it('redacts EMAIL (uppercase key)', () => {
      expect(scrub({ EMAIL: 'test@example.com' })).toEqual({ EMAIL: '[redacted]' });
    });

    it('redacts Authorization (mixed case key)', () => {
      expect(scrub({ Authorization: 'Bearer abc' })).toEqual({
        Authorization: '[redacted]',
      });
    });
  });

  describe('non-PII keys', () => {
    it('passes through non-PII keys unchanged', () => {
      expect(scrub({ userId: 'uuid-123', action: 'feed_viewed', count: 5 })).toEqual({
        userId: 'uuid-123',
        action: 'feed_viewed',
        count: 5,
      });
    });
  });

  describe('nested objects', () => {
    it('scrubs PII in directly nested objects', () => {
      expect(scrub({ user: { email: 'a@b.com', identifier: 'CrimsonFox42' } })).toEqual({
        user: { email: '[redacted]', identifier: 'CrimsonFox42' },
      });
    });

    it('scrubs PII in deeply nested objects', () => {
      expect(scrub({ a: { b: { c: { token: 'secret' } } } })).toEqual({
        a: { b: { c: { token: '[redacted]' } } },
      });
    });
  });

  describe('arrays of objects', () => {
    it('scrubs PII in each array element', () => {
      const input = [
        { email: 'alice@example.com', identifier: 'AliceFox1' },
        { email: 'bob@example.com', identifier: 'BobBear2' },
      ];
      expect(scrub(input)).toEqual([
        { email: '[redacted]', identifier: 'AliceFox1' },
        { email: '[redacted]', identifier: 'BobBear2' },
      ]);
    });

    it('scrubs PII in arrays nested inside objects', () => {
      expect(scrub({ participants: [{ email: 'x@y.com' }] })).toEqual({
        participants: [{ email: '[redacted]' }],
      });
    });
  });

  describe('immutability', () => {
    it('does not mutate the input object', () => {
      const original = { email: 'test@example.com', action: 'login' };
      scrub(original);
      expect(original.email).toBe('test@example.com');
    });

    it('does not mutate the input array', () => {
      const original = [{ email: 'test@example.com' }];
      scrub(original);
      expect(original[0]?.email).toBe('test@example.com');
    });
  });
});

// ─── logger ──────────────────────────────────────────────────────────────────

describe('logger', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logger.info scrubs PII before logging', () => {
    logger.info('user login', { email: 'test@example.com', action: 'login' });
    expect(infoSpy).toHaveBeenCalledWith('user login', {
      email: '[redacted]',
      action: 'login',
    });
  });

  it('logger.warn scrubs PII before logging', () => {
    logger.warn('auth warning', { token: 'secret-token', source: 'auth' });
    expect(warnSpy).toHaveBeenCalledWith('auth warning', {
      token: '[redacted]',
      source: 'auth',
    });
  });

  it('logger.error scrubs PII before logging', () => {
    logger.error('signup failed', { password: 'hunter2', reason: 'weak' });
    expect(errorSpy).toHaveBeenCalledWith('signup failed', {
      password: '[redacted]',
      reason: 'weak',
    });
  });

  it('logger.info works without a context argument', () => {
    logger.info('app started');
    expect(infoSpy).toHaveBeenCalledWith('app started', undefined);
  });
});
