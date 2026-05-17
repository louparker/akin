// i18n — thin wrapper around the translation dictionaries.
// Default locale: device preference, falling back to Swedish ('sv').
// All user-visible strings must go through t() — never hardcode copy.

import { getLocales } from 'expo-localization';
import { en } from '@/i18n/en';
import { sv } from '@/i18n/sv';

export type Locale = 'sv' | 'en';
export type TranslationKey = keyof typeof en;

const dictionaries = { sv, en } satisfies Record<Locale, Record<TranslationKey, string>>;

function getDeviceLocale(): Locale {
  const locales = getLocales();
  const tag = locales[0]?.languageTag ?? 'sv';
  if (tag.startsWith('en')) return 'en';
  return 'sv'; // default: Swedish
}

// Active locale — determined once at startup.
// In a full implementation this would be stored in user preferences (Zustand).
export const locale: Locale = getDeviceLocale();

export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  // dictionaries is keyed by Locale (a finite union), and key is TranslationKey
  // (constrained to keyof typeof en). Neither is user-controlled input.
  // eslint-disable-next-line security/detect-object-injection
  const str0: string = dictionaries[locale][key] ?? dictionaries.sv[key] ?? key;
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
