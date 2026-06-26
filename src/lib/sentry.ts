/**
 * Sentry initialisation — call initSentry() once at app boot (app/_layout.tsx),
 * before any other import that could throw.
 *
 * CRITICAL-PATH: auth / error-reporting surface — review before production.
 *
 * Source maps are uploaded via the EAS Build `@sentry/react-native/metro` plugin.
 * Add `@sentry/react-native` to the `plugins` array in app.config.ts and configure
 * `sentry.properties` with the org + project slugs before the first production build.
 */

import { scrub } from '@/lib/logger';

interface SentryOptions {
  dsn: string;
  appEnv: string;
}

type SentryModule = typeof import('@sentry/react-native');

// Lazy-load to avoid crashing in Expo Go where NativeJSLogger (Sentry's native
// bridge) is absent. The require() throws during module init in that environment.
const _sentry = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as SentryModule;
  } catch {
    return null;
  }
})();

export function initSentry({ dsn, appEnv }: SentryOptions): void {
  if (!dsn || _sentry === null) return;

  _sentry.init({
    dsn,
    environment: appEnv,
    // 10% sampling in production keeps costs low; 100% in dev/preview for full visibility.
    tracesSampleRate: appEnv === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.extra) {
        event.extra = scrub(event.extra) as typeof event.extra;
      }
      return event;
    },
  });
}

export const Sentry = _sentry;
