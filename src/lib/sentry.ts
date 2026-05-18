/**
 * Sentry initialisation — call initSentry() once at app boot (app/_layout.tsx),
 * before any other import that could throw.
 *
 * CRITICAL-PATH: auth / error-reporting surface — review before production.
 *
 * Source maps are uploaded via the EAS Build `@sentry/react-native/metro` plugin.
 * Add `@sentry/react-native` to the `plugins` array in app.json and configure
 * `sentry.properties` with the org + project slugs before the first production build.
 */

import * as Sentry from '@sentry/react-native';
import { scrub } from '@/lib/logger';

interface SentryOptions {
  dsn: string;
  appEnv: string;
}

export function initSentry({ dsn, appEnv }: SentryOptions): void {
  if (!dsn) return;

  Sentry.init({
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

export { Sentry };
