/**
 * Project-wide structured logger.
 *
 * All context objects are scrubbed of PII before output. The interface
 * mirrors Sentry's captureMessage / captureException so wiring in the
 * real SDK in Phase 3 is mechanical — replace the console.* calls with
 * the Sentry equivalents without touching call sites.
 *
 * Usage:
 *   logger.info('feed_loaded', { postCount: 10 });
 *   logger.warn('rate_limit_near', { userId: id });
 *   logger.error('post_create_failed', { reason: err.message });
 *
 * Never pass: email, password, token, IP, post body/title, or notes.
 * The scrubber redacts them, but it is better not to collect them at all.
 */

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
    // PHASE 3: replace with Sentry.addBreadcrumb({ message, data: scrub(context) })
    // eslint-disable-next-line no-console -- logger.ts is the approved console wrapper; call sites must use logger, not console directly
    console.info(message, context !== undefined ? scrub(context) : undefined);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    // PHASE 3: replace with Sentry.captureMessage(message, { level: 'warning', extra: scrub(context) })
    // eslint-disable-next-line no-console -- logger.ts is the approved console wrapper; call sites must use logger, not console directly
    console.warn(message, context !== undefined ? scrub(context) : undefined);
  },

  error(message: string, context?: Record<string, unknown>): void {
    // PHASE 3: replace with Sentry.captureException or Sentry.captureMessage with level 'error'
    // eslint-disable-next-line no-console -- logger.ts is the approved console wrapper; call sites must use logger, not console directly
    console.error(message, context !== undefined ? scrub(context) : undefined);
  },
};
