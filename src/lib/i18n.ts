// i18n — thin wrapper around the translation dictionaries.
//
// The active locale is the union of:
//   1. The user's explicit preference (sv / en / system) in useLocaleStore.
//   2. The device locale (read once at module load), used when preference === 'system'.
//   3. Swedish as the ultimate fallback.
//
// `t()` reads the active locale on every call, so components re-render with the
// new strings as soon as the surrounding tree re-renders. Components that need
// to react *directly* to a locale change should use `useT()` which subscribes
// to the store.

import { getLocales } from 'expo-localization';
import { en } from '@/i18n/en';
import { sv } from '@/i18n/sv';
import { useLocaleStore } from '@/features/locale/store/useLocaleStore';

export type Locale = 'sv' | 'en';
export type TranslationKey = keyof typeof en;

const dictionaries = { sv, en } satisfies Record<Locale, Record<TranslationKey, string>>;

function getDeviceLocale(): Locale {
  const locales = getLocales();
  const tag = locales[0]?.languageTag ?? 'sv';
  if (tag.startsWith('en')) return 'en';
  return 'sv';
}

// Device locale snapshot — does not change at runtime; mirrors the OS at boot.
export const DEVICE_LOCALE: Locale = getDeviceLocale();

export function getActiveLocale(): Locale {
  const preference = useLocaleStore.getState().preference;
  if (preference === 'sv' || preference === 'en') return preference;
  return DEVICE_LOCALE;
}

// Back-compat: keep `locale` as a named export for older call sites that read
// it directly (e.g. Intl.DateTimeFormat). Prefer `getActiveLocale()` in new
// code so the value is fresh.
export const locale: Locale = DEVICE_LOCALE;

export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const active = getActiveLocale();
  // `active` is a finite union and `key` is constrained to TranslationKey —
  // neither is user-controlled input.
  // eslint-disable-next-line security/detect-object-injection
  const str0: string = dictionaries[active][key] ?? dictionaries.sv[key] ?? key;
  let str = str0;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      // k comes from a caller-supplied object literal, not user-controlled data.
      // eslint-disable-next-line security/detect-non-literal-regexp
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }

  return str;
}

/**
 * React hook for components that need to re-render when the locale changes.
 * Subscribes to the store so a preference change triggers a re-render; returns
 * the same `t` function and the current active locale.
 */
export function useT(): { t: typeof t; locale: Locale } {
  // Subscribe to the preference field — Zustand re-renders the component on change.
  useLocaleStore((s) => s.preference);
  return { t, locale: getActiveLocale() };
}
