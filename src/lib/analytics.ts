/**
 * Analytics wrapper — PostHog EU.
 *
 * Design invariants (enforced here):
 *  1. No identity linkage. The PostHog distinct ID is a random UUID stored in
 *     expo-secure-store. It is never the user's auth.uid() or email. See ADR-012.
 *  2. PII scrubbing. All props are passed through scrub() before being sent,
 *     mirroring the same protection in logger.ts.
 *  3. Session replay disabled by default.
 *  4. EU data residency: host is https://eu.posthog.com.
 *  5. Lazy initialisation — the PostHog client is created on the first track()
 *     call (or when initAnalytics() is called explicitly from app/_layout.tsx).
 *
 * Usage:
 *   import { track } from '@/lib/analytics';
 *   track('post_created', { category: 'vent_space' });
 *
 * To initialise early (recommended — call from app/_layout.tsx):
 *   import { initAnalytics } from '@/lib/analytics';
 *   void initAnalytics();
 *
 * No PII is ever passed to this module. Only behavioural event names and
 * opaque property values are allowed.
 */

import { PostHog } from 'posthog-react-native';
import * as SecureStore from 'expo-secure-store';
import { getEnv } from '@/lib/env';
import { scrub } from '@/lib/logger';

// ─── Constants ────────────────────────────────────────────────────────────────

const POSTHOG_HOST = 'https://eu.posthog.com';
const DISTINCT_ID_KEY = 'posthog_distinct_id';

// ─── Event type definitions ───────────────────────────────────────────────────

/**
 * Union of all analytics events.  Adding an event here documents it in one
 * place and gives call-site type checking.
 *
 * - Events with no payload use `props?: Record<string, never>` so callers
 *   cannot accidentally pass any properties.
 * - Events with required payload use `props: { ... }` with explicit fields.
 */
export type AnalyticsEvent =
  | { name: 'app_opened'; props?: Record<string, never> }
  | { name: 'signed_up'; props?: Record<string, never> }
  | { name: 'signed_in'; props?: Record<string, never> }
  | { name: 'post_created'; props: { category: string } }
  | { name: 'comment_created'; props: { category: string } }
  | { name: 'report_filed'; props: { reason: string } }
  | { name: 'block_added'; props?: Record<string, never> }
  | { name: 'content_filter_blocked'; props: { rule_type: string } }
  | { name: 'language_changed'; props: { language: string } };

/**
 * Extract the props type for a given event name.
 * Evaluates to `undefined` when the event has no payload.
 */
type PropsForEvent<N extends AnalyticsEvent['name']> = Extract<
  AnalyticsEvent,
  { name: N }
>['props'];

// ─── Distinct ID management ───────────────────────────────────────────────────

/**
 * Returns the PostHog distinct ID.
 *
 * On the first call the ID does not exist in secure storage, so a random
 * UUID v4 is generated, persisted, and returned.  On subsequent calls the
 * stored value is returned directly.
 *
 * CRITICAL: The ID is never derived from auth.uid() or the user's email.
 * This is an anonymity guarantee — see ADR-012.
 */
export async function getDistinctId(): Promise<string> {
  const stored = await SecureStore.getItemAsync(DISTINCT_ID_KEY);
  if (stored !== null) {
    return stored;
  }

  const newId = generateUUID();
  await SecureStore.setItemAsync(DISTINCT_ID_KEY, newId);
  return newId;
}

/** Generates a RFC 4122 v4 UUID using the Hermes crypto global. */
function generateUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant (10xx) bits per RFC 4122 §4.4.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- bytes[6] always exists (length 16)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- bytes[8] always exists (length 16)
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ─── PostHog client (lazy singleton) ─────────────────────────────────────────

let _client: PostHog | null = null;

/**
 * Resets the PostHog singleton.  Only for use in tests.
 * @internal
 */
export function _resetClientForTesting(): void {
  _client = null;
}

/**
 * Returns (and lazily initialises) the PostHog singleton.
 *
 * Exported for testing.  App code should use track() directly.
 */
export function getPostHogClient(): PostHog | null {
  if (_client !== null) {
    return _client;
  }

  const env = getEnv();
  if (!env.posthogKey) return null;

  _client = new PostHog(env.posthogKey, {
    host: POSTHOG_HOST,
    enableSessionReplay: false,
  });

  return _client;
}

/**
 * Explicitly initialises the PostHog client and wires the anonymous distinct ID.
 *
 * Call once from app/_layout.tsx so the client is warm before the first
 * track() call.  Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initAnalytics(): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;
  const distinctId = await getDistinctId();
  client.identify(distinctId);
}

// ─── track() ─────────────────────────────────────────────────────────────────

/**
 * Tracks an analytics event.
 *
 * Props are scrubbed of PII keys before being sent to PostHog.  The distinct
 * ID is resolved from secure storage on the first call.
 *
 * @example
 *   await track('post_created', { category: 'vent_space' });
 *   await track('app_opened');
 */
export async function track<N extends AnalyticsEvent['name']>(
  name: N,
  ...rest: PropsForEvent<N> extends Record<string, never> | undefined
    ? [props?: PropsForEvent<N>]
    : [props: PropsForEvent<N>]
): Promise<void> {
  const [props] = rest;
  const client = getPostHogClient();
  if (!client) return;
  const distinctId = await getDistinctId();

  // Scrub PII from props before sending.  scrub() returns a new object —
  // the original is never mutated.
  const scraped = props !== undefined ? (scrub(props) as Record<string, unknown>) : {};

  // Remove any PII keys that scrub() replaced with '[redacted]' — we prefer
  // to omit them entirely rather than sending the placeholder string.
  const safeProps = Object.fromEntries(
    Object.entries(scraped).filter(([, v]) => v !== '[redacted]'),
  );

  client.capture(name, { ...safeProps, distinct_id: distinctId });
}
