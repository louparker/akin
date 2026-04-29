---
name: security
description: Read this skill before merging any code. Covers the four-lens self-review checklist, secrets handling, input validation, the auth flow, and the patterns that cause subtle exploitable bugs in AI-built apps.
---

# Security skill

> Activate this skill at two moments: (1) when writing any code that handles user input, auth, or data access, and (2) before marking any task done. The Section 5 checklist is the gate that everything passes through.

---

## 1. The threat model in one paragraph

Akin is anonymous, dating-adjacent, and bilingual. The realistic threats are: harassers ban-evading, scammers extracting contact info, false reports as a weapon, exposed PII (especially email and IP) leaking to other users, and bypass of the participation limits. The unrealistic-but-catastrophic threats are: GDPR breach (regulatory and brand-ending), CSAM (legally and morally non-negotiable), credential stuffing succeeding because we shipped weak password rules.

Every line of code is judged against this threat model.

---

## 2. Secrets

What counts as a secret:

- The Supabase service-role key.
- Sentry DSN (less critical but still don't ship in source).
- PostHog server key.
- Resend API key.
- Stripe secret key (later).
- Any signing key or webhook secret.

Where they live:

- Edge Function secrets: `supabase secrets set` only. Never in source.
- CI secrets: GitHub Actions repository secrets.
- Local development: `.env.local`, gitignored. There is also a `.env.example` in source listing the required keys with empty values.

Where they DO NOT live:

- Source files (`.ts`, `.tsx`, `.sql`).
- Commits.
- Logs.
- Sentry events.
- Test fixtures.

The Supabase **anon key** is shipped in the client app. It is not a secret — it is rate-limited by Supabase and gated by RLS. But it should still be loaded via env vars, not hardcoded.

---

## 3. Input validation — defence in depth

Every input is validated in three places:

1. **Client form (Zod)** — fast feedback for the user, prevents obviously bad submissions.
2. **Database constraints** — `CHECK`, `NOT NULL`, length limits, foreign keys. The last line of defence.
3. **RLS `WITH CHECK`** — authorisation predicates, e.g. "you can only insert posts where `author_id = auth.uid()`."

Don't rely on any one layer. The client can be skipped (someone with the anon key can call the API directly). The database can be permissive in unforeseen ways. RLS can have gaps. Three layers means a single mistake doesn't open a hole.

---

## 4. Auth flow specifics

### Email + password

- Minimum password: 8 characters, mixed-case + number recommended (UX nudge, not a hard rule beyond length).
- Use Supabase's built-in password strength check. Don't roll your own.
- Lockout after 5 failed attempts in 10 minutes — Supabase Auth supports this; configure it.

### Email verification

- Required before posting or commenting (enforced at RLS).
- The verification email is sent by Supabase Auth via the Resend transactional template.
- Links expire in 24 hours.

### Session

- JWT stored in `expo-secure-store` (Keychain on iOS, Keystore on Android). Never in `AsyncStorage`. Never in plain text.
- Refresh handled automatically by the Supabase JS SDK.
- On logout: `supabase.auth.signOut()` AND clear any Zustand state that holds user-derived data.

### Age gate

- Captured at signup as a required checkbox.
- Stored as `profiles.age_verified_at = now()`.
- RLS policies on insert require `age_verified_at IS NOT NULL`.
- Self-attestation only — App Store and EU compliance allow this for an 18+ social/discussion app, but document the choice in `DECISIONS.md`.

---

## 5. The four-lens self-review checklist

Run this before marking any task done. If you can't honestly tick all the boxes, you're not done.

### Lens 1 — Security

- [ ] Every new user input is validated client-side (Zod) and database-side (constraint or trigger).
- [ ] No new RLS policy uses `USING (true)` outside an explicitly public-read scenario.
- [ ] No service-role calls from the client.
- [ ] No secrets in source.
- [ ] No PII (email, IP, message content, identifier) sent to Sentry or PostHog.
- [ ] Rate limiting in place for any new write endpoint.
- [ ] If touching auth: tested with an unverified email, a verified email without `age_verified_at`, and a banned user. All three correctly denied.
- [ ] If touching block: tested that blocked users disappear from feed and post detail.

### Lens 2 — Data

- [ ] Foreign keys on every relationship.
- [ ] Indexes on every FK and every column used in a WHERE.
- [ ] Cascading deletes thought through. (Hint: usually you want soft delete via `status`, not real `ON DELETE CASCADE`.)
- [ ] No orphan rows possible.
- [ ] Generated TypeScript types regenerated (`pnpm gen:types`).
- [ ] Migrations are append-only — no editing of merged files.

### Lens 3 — UX

- [ ] All four states present: loading, empty, error, loaded.
- [ ] Both languages render. Tested with Swedish strings at 130% font scale.
- [ ] Both themes (light and dark) render correctly.
- [ ] All interactive elements have `accessibilityRole` and `accessibilityLabel`.
- [ ] Tap targets ≥ 44pt.
- [ ] No hardcoded strings, no magic colours, no magic spacing values.
- [ ] Animations skip when `useReducedMotion()` is true.

### Lens 4 — Performance

- [ ] No N+1 queries. (For each parent row, do not fetch children in a loop. Use a join or `in`.)
- [ ] FlashList for any unbounded list.
- [ ] `React.memo` + `useCallback` + `useMemo` applied where re-render cost is real, NOT applied where it isn't.
- [ ] No animations on the JS thread.
- [ ] Images sized appropriately and `expo-image` used (not raw `<Image>`).
- [ ] Heavy synchronous work moved off the JS thread (worklets, native modules, or backgrounded).

---

## 6. Logging — never log PII

The logger lives at `src/lib/logger.ts` and scrubs known PII fields before sending to Sentry/PostHog:

```ts
// src/lib/logger.ts
const PII_KEYS = ['email', 'password', 'token', 'authorization', 'ip', 'body', 'title'];

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    Sentry.addBreadcrumb({ message, data: scrub(context), level: 'info' });
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    Sentry.captureMessage(message, { extra: scrub(context), level: 'warning' });
  },
  error: (error: Error, context?: Record<string, unknown>) => {
    Sentry.captureException(error, { extra: scrub(context) });
  },
};

const scrub = (context?: Record<string, unknown>) => {
  if (!context) return undefined;
  return Object.fromEntries(
    Object.entries(context).map(([k, v]) =>
      PII_KEYS.includes(k.toLowerCase()) ? [k, '[redacted]'] : [k, v],
    ),
  );
};
```

Don't use `console.log` in production code. ESLint enforces this.

---

## 7. Critical-path markers

When you write code that handles authentication, RLS policy enforcement, or (later) payments, mark it with a comment so the founder can find it during the quarterly expert review:

```ts
// CRITICAL-PATH: auth — reviewed by [name] on YYYY-MM-DD
```

If unreviewed:

```ts
// CRITICAL-PATH: auth — pending expert review
```

`grep -r "CRITICAL-PATH"` produces the review queue.

---

## 8. Common AI-introduced security bugs — read this list

These are bugs that AI agents commonly introduce. Watch for them in self-review.

1. **Forgetting to check `auth.uid()` in an RLS policy `WITH CHECK`.** Result: any authenticated user can insert rows pretending to be someone else.
2. **Using `SECURITY DEFINER` without `SET search_path`.** Result: schema confusion attack possible.
3. **Returning the full row including sensitive columns from a function.** Result: PII leak.
4. **Trusting client-supplied `userId` in a hook.** Always derive it from the session.
5. **Using `eval`, `Function()`, or `new Function()`** anywhere. Don't. Period.
6. **Accepting unbounded text inputs.** Always cap at the DB level.
7. **Skipping the email verification check on a posting endpoint.** Posters become spammers.
8. **Mocking auth in a way that leaks into production.** Test mocks must be in `__tests__/` or behind `__DEV__`.

---

## 9. Dependency hygiene

- Run `pnpm audit` weekly. Fix high/critical vulns within a week.
- New deps require an entry in `DECISIONS.md` and a check that the package is widely used (not abandoned).
- Pin major versions. Use `^` for minor/patch.
- Don't pull in micro-deps for one-line utilities you can write in five.

---

## 10. App Store + Play Store security requirements

Specific to a dating-adjacent UGC app:

- App Store guideline 1.2: filtering, reporting, blocking, and a method for the developer to act on objectionable content. All four are in v1.
- Submit notes that explicitly reference compliance with 1.2.
- Privacy nutrition label: declare every data type you collect (email, anonymous identifier, IP for rate limiting, crash data via Sentry, behavioural events via PostHog). No surprises during review.
- Sign in with Apple is required if you offer any other social sign-in. Akin only does email + password, so this doesn't apply unless you add Google/Facebook later.
- ATS (App Transport Security): all traffic over HTTPS. No exceptions.
