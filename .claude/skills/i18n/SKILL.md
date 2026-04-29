---
name: i18n
description: Read this skill before adding or changing any user-facing string. Covers Swedish + English string management, namespacing, pluralisation, when AI translation is acceptable, and when native review is required.
---

# i18n skill

> Activate this skill whenever you add a string a user will see, or touch `src/i18n/`. Never hardcode user-facing text.

---

## 1. The two languages

Akin ships in Swedish (`sv`) and English (`en`) at launch. Both are first-class. The default locale is determined by the device's preferred language list, falling back to Swedish.

Locale is stored on `profiles.language` and editable in Settings.

---

## 2. File layout

```
src/i18n/
├── index.ts              # i18next setup, locale detection
├── sv.ts                 # Swedish strings
├── en.ts                 # English strings
└── types.ts              # Generated types from the en.ts shape
```

`sv.ts` and `en.ts` have identical key shapes. Adding a key to one without the other breaks types.

---

## 3. Namespacing

Strings are organised by feature, then by purpose:

```ts
// src/i18n/en.ts
export const en = {
  auth: {
    signup: {
      title: 'Welcome to Akin',
      subtitle: 'A space to talk honestly about dating.',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      ageGate: 'I am 18 or older',
      submit: 'Sign up',
      errors: {
        emailInvalid: 'Please enter a valid email.',
        passwordTooShort: 'Password must be at least 8 characters.',
        ageNotConfirmed: 'You must confirm you are 18 or older.',
      },
    },
    login: { /* ... */ },
  },
  feed: {
    title: 'Latest',
    empty: {
      title: 'Quiet for now',
      body: 'Be the first to share something.',
      cta: 'Write a post',
    },
    sortOptions: {
      recent: 'Most recent',
      comments: 'Most comments',
      spice: 'Spiciest',
    },
  },
  post: {
    create: { /* ... */ },
    detail: { /* ... */ },
    spice: {
      label_one: 'One flame',
      label_other: '{{count}} flames',
      vote: 'Rate this post',
      yourVote: 'Your rating: {{score}}',
    },
    limits: {
      postFull: 'This conversation has reached its participant limit.',
      userActiveCap: 'You\'re currently active in 3 conversations. Conclude one to join another.',
    },
  },
  // ...
} as const;

export type TranslationShape = typeof en;
```

`sv.ts` mirrors this exactly. The `TranslationShape` type ensures the agent (and the type checker) catch missing keys.

---

## 4. Pluralisation

Use ICU-style plural keys. i18next handles this with `_one`, `_other` suffixes:

```ts
spice: {
  label_one: 'One flame',
  label_other: '{{count}} flames',
}

// usage
t('post.spice.label', { count: 3 }) // "3 flames"
t('post.spice.label', { count: 1 }) // "One flame"
```

Swedish has the same one/other plural rule as English so this works for both.

---

## 5. Interpolation

Use `{{name}}` for variables. Never concatenate translations. Bad:

```ts
const greeting = t('greetings.hello') + ', ' + name + '!';
```

Good:

```ts
// en.ts: greetings: { helloWithName: 'Hello, {{name}}!' }
const greeting = t('greetings.helloWithName', { name });
```

Concatenation breaks for languages with different word order.

---

## 6. When the agent can translate, when it can't

The agent can produce a first-pass Swedish translation for:

- UI labels and microcopy.
- Error messages with technical terms.
- Empty-state and onboarding copy.

The agent must NOT be the final word for:

- Legal text (privacy policy, terms of service, GDPR notices).
- Anything user-visible in the moderation flow (false-positive risk).
- Marketing-grade copy (taglines, App Store descriptions).
- Community guidelines wording.

For these, the agent produces a draft labelled with a `// TODO i18n review:` comment, and the founder routes it to a native Swedish UX writer or lawyer before launch.

In code, mark uncertain strings:

```ts
// TODO i18n review: legal phrasing, needs lawyer
privacyPolicyLink: 'Sekretesspolicy',
```

Run `grep -r "TODO i18n review:"` before any release.

---

## 7. Long strings — Swedish runs longer

Swedish copy averages 10–25% longer than English. Design for the longer language.

- Test layouts at 130% font scale with the Swedish strings — that's where overflow bugs appear.
- Don't pin button widths; let them grow.
- For headlines, give the line two-line space even if English fits in one.

---

## 8. The translation function — typed

```ts
// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import type { TranslationShape } from '@/i18n/types';

// Strongly typed t()
declare module 'react-i18next' {
  interface CustomTypeOptions {
    resources: { translation: TranslationShape };
    defaultNS: 'translation';
  }
}
```

This makes `t('post.detail.title')` autocomplete and error if the key is missing or the params are wrong.

---

## 9. Locale-sensitive formatting

- Dates: `date-fns` with `sv` and `enGB` locales. Never hand-format. Akin uses relative time ("3 hours ago", "för 3 timmar sedan") via `formatDistanceToNow`.
- Numbers: `Intl.NumberFormat`. Swedish uses `, ` for decimals and ` ` for thousands — let the API handle it.
- Currency (later, for Premium): `Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' })`.

---

## 10. Reviewing translations

Before merging a new feature:

- [ ] Every user-visible string is in both `sv.ts` and `en.ts`.
- [ ] No hardcoded strings in components.
- [ ] No string concatenation across translations.
- [ ] Plurals use the `_one` / `_other` pattern.
- [ ] Layout tested with Swedish strings at 130% font scale.
- [ ] Any uncertain phrasing flagged with `// TODO i18n review:`.
- [ ] No legal/marketing/moderation copy without a human-review note.
