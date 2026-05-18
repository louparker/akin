/**
 * Project-wide structured logger.
 *
 * All context objects are scrubbed of PII before output and before being sent
 * to Sentry. Call sites must import from this module — never use console.* directly.
 *
 * Usage:
 *   logger.info('feed_loaded', { postCount: 10 });
 *   logger.warn('rate_limit_near', { source: 'auth' });
 *   logger.error('post_create_failed', { reason: err.message });
 *   logger.error(new Error('unexpected'), { context: 'feed' }); // captureException path
 *
 * Never pass: email, password, token, IP, post body/title, or notes.
 * The scrubber redacts them, but it is better not to collect them at all.
 */

type SentryModule = typeof import('@sentry/react-native');

// Lazy-load to avoid crashing in Expo Go where NativeJSLogger is absent.
const _sentry = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as SentryModule;
  } catch {
    return null;
  }
})();

/** Keys whose values are replaced with '[redacted]' (case-insensitive). */
const PII_KEYS = new Set([
  'email',
  'password',
  'token',
  'authorization',
  'ip',
  'body',
  'title',
  'notes',
]);

/**
 * Recursively scrubs PII from a plain-object or array value.
 * Returns a new object/array — the input is never mutated.
 * Non-object values are returned as-is.
 */
export function scrub(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrub);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        PII_KEYS.has(k.toLowerCase()) ? '[redacted]' : scrub(v),
      ]),
    );
  }

  return value;
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    const scrubbed =
      context !== undefined ? (scrub(context) as Record<string, unknown>) : undefined;
    _sentry?.addBreadcrumb({ message, data: scrubbed });
    // eslint-disable-next-line no-console -- logger.ts is the approved console wrapper
    console.info(message, scrubbed);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    const scrubbed =
      context !== undefined ? (scrub(context) as Record<string, unknown>) : undefined;
    _sentry?.captureMessage(message, { level: 'warning', extra: scrubbed });
    // eslint-disable-next-line no-console -- logger.ts is the approved console wrapper
    console.warn(message, scrubbed);
  },

  /**
   * Log an error.
   * - Pass a string + optional context for operational errors (→ captureMessage).
   * - Pass an Error object for unexpected exceptions (→ captureException).
   */
  error(messageOrError: string | Error, context?: Record<string, unknown>): void {
    const scrubbed =
      context !== undefined ? (scrub(context) as Record<string, unknown>) : undefined;

    if (messageOrError instanceof Error) {
      _sentry?.captureException(messageOrError, { extra: scrubbed });
      // eslint-disable-next-line no-console -- logger.ts is the approved console wrapper
      console.error(messageOrError, scrubbed);
    } else {
      _sentry?.captureMessage(messageOrError, { level: 'error', extra: scrubbed });
      // eslint-disable-next-line no-console -- logger.ts is the approved console wrapper
      console.error(messageOrError, scrubbed);
    }
  },
};
