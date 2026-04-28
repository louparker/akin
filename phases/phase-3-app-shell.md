# Phase 3 — App shell & design system

> **Goal:** the bones of the mobile app. Routing, theme, primitives, i18n, observability, and the Supabase client wired up. After this phase, the app boots, knows who you are (or that you're not signed in), and has every cross-cutting concern in place.
>
> **Estimated duration:** 4–6 days.
>
> **Prerequisites:** Phase 2 signed off.
>
> **Skills referenced:** `ui` (read end-to-end), `i18n`, `security`, `testing`.

---

## Phase deliverables — sign-off checklist

- [ ] Expo Router v4 file-based navigation with `(auth)` and `(main)` route groups.
- [ ] Design tokens (colours, spacing, typography) in place; light + dark themes wired through NativeWind.
- [ ] Primitives layer (`Text`, `View`, `Pressable`, `Input`, `Button`) with variants and tests.
- [ ] i18n scaffolding with sv + en stubs; typed `t()` function.
- [ ] Sentry, PostHog, and the logger fully wired.
- [ ] Supabase client singleton with secure session persistence.
- [ ] Feature-flag fetcher with sane defaults and 60s polling.
- [ ] Top-level error boundary with bilingual fallback screen.
- [ ] Splash → routing decision (auth vs main) works for: signed-in, signed-out, banned user.

---

## Task 3.1 — Install Expo Router v4 and the route groups

**Context:** `CLAUDE.md` §3 (tech stack), §4 (repo layout).

**Goal:** file-based navigation with auth and main route groups; root layout decides which group to mount based on session state.

**Acceptance criteria:**

- `expo-router` configured per Expo SDK 55+ docs.
- `app/_layout.tsx` is the root layout. Reads the Supabase session and routes to `(auth)` or `(main)`.
- `app/(auth)/_layout.tsx` is a stack navigator for auth screens.
- `app/(main)/_layout.tsx` is a tab navigator (Feed / Create / Profile / Settings).
- A stub screen in each group renders correctly (`(auth)/welcome.tsx`, `(main)/feed.tsx`, etc.).
- Deep linking config (`app.json` `scheme: "akin"`) registered.

**Tests to write first:**

- Component test: with no session, root layout renders `<Slot />` inside the `(auth)` group.
- Component test: with a valid session, root layout renders `<Slot />` inside the `(main)` group.
- Component test: with a banned profile status, root layout renders the `BannedScreen` regardless of session.

**Implementation notes:**

- Don't put business logic in route files. Routes import from `src/features/*`.
- The "is signed in?" check should NOT block on a network call. Read from local secure storage first, refresh in the background.
- If the session is expired but a refresh token exists, attempt a silent refresh before deciding.

**Self-review (security lens):**

- [ ] No JWT in route URL params.
- [ ] No PII in deep-link query strings.
- [ ] Banned-user routing tested — they cannot reach the main group.

**Done when:** all three test cases pass.

---

## Task 3.2 — Design tokens and Tailwind config

**Context:** `.claude/skills/ui/SKILL.md` §2.

**Goal:** the colour, spacing, and typography tokens are committed and available via NativeWind class names.

**Acceptance criteria:**

- `src/theme/colors.ts` exports light and dark colour palettes per the skill file.
- `src/theme/spacing.ts` exports the 4px scale.
- `src/theme/typography.ts` exports families, sizes, weights, line-heights.
- `tailwind.config.js` extends with the tokens so classes like `bg-bg-base`, `text-fg-primary`, `p-lg`, `text-xl` exist.
- `useColorTokens()` hook returns the active theme's tokens (light or dark) based on system preference and user override.
- Inter and GT Sectra (or licensed alternative — check budget) loaded via `expo-font`.

**Tests to write first:**

- Unit test: `useColorTokens()` returns light tokens when system is light.
- Unit test: `useColorTokens()` returns dark tokens when system is dark.
- Unit test: user override (`'light' | 'dark' | 'system'` from a Zustand slice) takes precedence over system.

**Implementation notes:**

- GT Sectra is licensed. Akin can use a free alternative for now (e.g. `Lora`, `Source Serif 4`, or `Newsreader`) and revisit at brand-design time. Document the choice in `DECISIONS.md`.
- Inter is open source, no licensing concerns.
- Font loading via `expo-font` happens in the root layout. Splash stays up until fonts are ready.

**Self-review (UX lens):**

- [ ] Light theme contrast ratios verified (4.5:1 body, 3:1 large).
- [ ] Dark theme contrast ratios verified.
- [ ] Tokens exported as `as const` for type narrowing.

**Done when:** all tests pass; both themes render correctly on a sample screen.

---

## Task 3.3 — Primitives layer

**Context:** `.claude/skills/ui/SKILL.md` §3, §4.

**Goal:** `Text`, `View`, `Pressable`, `Input`, `Button` primitives with variants. Used everywhere instead of raw RN components.

**Acceptance criteria:**

- `src/components/primitives/Text.tsx` with variants `body | bodyMuted | caption | title | display`.
- `src/components/primitives/View.tsx` (thin wrapper, mainly for accessibility-role defaults).
- `src/components/primitives/Pressable.tsx` with built-in haptics, accessibility-role default `'button'`, and a press-scale animation that respects `useReducedMotion()`.
- `src/components/primitives/Input.tsx` with label, error state, accessibility wiring.
- `src/components/primitives/Button.tsx` with variants `primary | secondary | ghost | danger` and sizes `sm | md | lg`. Loading state with a spinner.
- Each primitive has a snapshot test and an a11y check test.

**Tests to write first (per primitive, this list applies to each):**

- Renders with default props.
- Renders each variant.
- Forwards `accessibilityLabel` and other a11y props.
- `Button`: shows a spinner when `loading`; press is a no-op when `loading` or `disabled`.
- `Input`: surfaces error state via `accessibilityState`; error text is announced to screen readers.
- `Pressable`: skips press-scale animation when `useReducedMotion()` is true.

**Implementation notes:**

- All primitives live in `src/components/primitives/`. Composed components (PostCard, CommentItem) live in `src/components/composed/` and use the primitives.
- The `Button` loading state must visually preserve width — don't let it shrink. Use a fixed-width spinner container.
- Haptics: `expo-haptics`. `Selection` haptic on press, `Success` on submit, `Error` on validation failure.

**Self-review (UX lens):**

- [ ] Tap targets ≥ 44pt on every primitive.
- [ ] Error states announced to screen readers.
- [ ] No raw colours; all via tokens.
- [ ] Both themes tested.

**Done when:** all tests pass; a "kitchen sink" screen rendering every primitive variant looks right on iOS + Android, light + dark.

---

## Task 3.4 — i18n scaffolding

**Context:** `.claude/skills/i18n/SKILL.md` end-to-end.

**Goal:** typed `t()` function, language detection, locale switching, and the file structure for sv + en strings.

**Acceptance criteria:**

- `i18next` and `react-i18next` installed.
- `src/i18n/en.ts` and `src/i18n/sv.ts` with the namespace skeleton from `i18n/SKILL.md` §3 (auth, feed, post, common — populate stubs only).
- `src/i18n/types.ts` exports `TranslationShape` derived from `en.ts`.
- `src/lib/i18n.ts` initialises i18next, with type augmentation per `i18n/SKILL.md` §8.
- Locale detection: device language → fallback to Swedish.
- User's chosen language stored on `profiles.language` (set in phase 4 signup); for phase 3, it's just system-derived.
- `useLocale()` hook for changing locale at runtime.
- Locale-sensitive date formatting via `date-fns` with the right locale.

**Tests to write first:**

- Unit test: `t('auth.signup.title')` returns the English string when locale is 'en'.
- Unit test: `t('auth.signup.title')` returns the Swedish string when locale is 'sv'.
- Unit test: missing key fails the type-check (compile-time test, write a `// @ts-expect-error` line).
- Unit test: pluralisation works (`t('post.spice.label', { count: 1 })` vs `count: 3`).
- Unit test: interpolation works (`t('greetings.helloWithName', { name: 'X' })`).
- Unit test: switching locale at runtime updates strings on the next render.

**Implementation notes:**

- i18next caches translations in memory. Don't re-initialise on every render.
- For dates, wrap `date-fns/formatDistanceToNow` with a small util that picks the locale based on current i18n state.

**Self-review (i18n lens):**

- [ ] Both files have identical key shapes.
- [ ] Type checking catches missing keys.
- [ ] No hardcoded strings in any component yet.

**Done when:** all tests pass; a screen with both languages renders side-by-side correctly.

---

## Task 3.5 — Supabase client singleton

**Context:** `.claude/skills/security/SKILL.md` §2 (secrets), `.claude/skills/database/SKILL.md` §3 (service-role boundaries).

**Goal:** one `supabase` client instance, configured with the anon key, secure session persistence.

**Acceptance criteria:**

- `src/lib/supabase.ts` exports a singleton `supabase` client.
- Session persistence via `expo-secure-store` (Keychain / Keystore), not `AsyncStorage`.
- Auto-refresh enabled.
- The client uses the EU-region URL.
- Realtime config: heartbeat interval 25s, connection params reasonable.
- A type import from `src/types/database.ts` is wired so `supabase.from('posts')` returns typed rows.

**Tests to write first:**

- Unit test: client initialises without throwing when env vars are present.
- Unit test: client throws a clear error if `SUPABASE_URL` is missing.
- Integration test (against local Supabase): unauthenticated `from('posts').select()` respects RLS — returns no rows when anon.

**Implementation notes:**

- The custom storage adapter for `expo-secure-store` is well-documented; copy from Supabase's RN setup guide.
- Do NOT export the service-role key. Ever. The mobile client is anon-only.

**Self-review (security lens):**

- [ ] No service-role key in the client bundle.
- [ ] JWTs in secure storage, never in AsyncStorage.
- [ ] Token refresh tested.
- [ ] Add `// CRITICAL-PATH: auth` marker.

**Done when:** all tests pass; a manual smoke test (sign up via the Supabase studio, see the session persist across app restart) works.

---

## Task 3.6 — Feature flags fetcher

**Context:** `.claude/skills/moderation/SKILL.md` §10.

**Goal:** the app reads kill-switches on boot and polls every 60s.

**Acceptance criteria:**

- `src/features/flags/api/useFeatureFlags.ts` — TanStack Query hook with 60s `staleTime` and `refetchInterval`.
- `useFlag('signups_open')` etc. returns `boolean` with sensible defaults if the row is missing.
- A Zustand slice mirrors the latest fetch result so non-Query consumers (e.g. boot logic) can read synchronously.
- A 5s timeout on the fetch — if it fails, fall back to defaults silently and log to Sentry.
- Types generated from `database.ts` so flag keys are autocompleted.

**Tests to write first:**

- Hook test: returns the default value when the API returns nothing.
- Hook test: returns the API value when the API returns a row.
- Hook test: refetches every 60s.
- Hook test: a 5s timeout falls back to defaults and logs to Sentry.

**Implementation notes:**

- Defaults live in `src/features/flags/defaults.ts` — single source of truth.
- During an outage, defaults of `true` for all flags is the safe choice (the app keeps working).

**Self-review:**

- [ ] No flag check ever blocks the UI on a network round-trip.
- [ ] Logger calls do not leak the user's identity.

**Done when:** all tests pass; pulling the database flag to false visibly affects the app within 60s.

---

## Task 3.7 — Sentry integration

**Context:** `.claude/skills/security/SKILL.md` §6.

**Goal:** errors are captured, source maps work, PII is scrubbed.

**Acceptance criteria:**

- `@sentry/react-native` installed and configured in `src/lib/sentry.ts`.
- Initialised once, before any other code, in `app/_layout.tsx`.
- `beforeSend` hook scrubs PII using the same `scrub()` from the logger.
- Source maps uploaded as part of EAS Build.
- The logger from task 1.10 now actually sends to Sentry.
- `Sentry.captureException` called from the top-level error boundary (built in 3.9).

**Tests to write first:**

- Unit test: `beforeSend` hook strips email, IP, and `body` from the event payload.
- Unit test: a `logger.error(new Error('test'))` call results in `Sentry.captureException` being invoked.

**Implementation notes:**

- DSN comes from `process.env.EXPO_PUBLIC_SENTRY_DSN`. Document the loading.
- Performance monitoring at 10% sampling for production, 100% for development. Document.
- Release names tied to git SHA via EAS env injection.

**Self-review:**

- [ ] No PII reaches Sentry — proven by the test.
- [ ] Source maps work on a production build (verify by triggering a test crash and checking the stack trace in Sentry).

**Done when:** test crash from a production EAS build shows up in Sentry with a readable stack trace and no PII.

---

## Task 3.8 — PostHog (EU) integration

**Context:** `.claude/skills/security/SKILL.md` §6.

**Goal:** behavioural analytics with PII scrubbing.

**Acceptance criteria:**

- `posthog-react-native` configured with EU host (`https://eu.posthog.com`).
- A typed `track()` wrapper in `src/lib/analytics.ts` so events are documented in one place.
- Events tracked initially: `app_opened`, `signed_up`, `signed_in`, `post_created`, `comment_created`, `report_filed`, `block_added`, `language_changed`. Build out more in later phases.
- No identity linkage — PostHog distinct ID is a random UUID stored in secure storage, NOT the user's `auth.uid()`.
- Session recordings DISABLED by default. (They capture too much.)

**Tests to write first:**

- Unit test: `track('post_created', { category: 'vent_space' })` calls the PostHog client with sanitised props.
- Unit test: PII keys (e.g. `email`) in the props object are stripped.
- Unit test: PostHog distinct ID is a random UUID, not the user ID.

**Implementation notes:**

- Anonymous-by-design tracking. Cohort analysis works without linkage to an account.
- Document the "no identity linkage" choice in `DECISIONS.md` — it limits some analyses but is the right trade for the brand.

**Self-review:**

- [ ] No event includes the user's email, identifier, or auth.uid.
- [ ] EU host confirmed.
- [ ] Session recordings off.

**Done when:** events fire to PostHog and appear in the dashboard within 30 seconds.

---

## Task 3.9 — Top-level error boundary

**Context:** `.claude/skills/ui/SKILL.md` §7 (error states); `.claude/skills/security/SKILL.md` §6.

**Goal:** any unhandled render error shows a friendly bilingual screen, logs to Sentry, offers a retry.

**Acceptance criteria:**

- `src/components/composed/ErrorBoundary.tsx` wraps the root layout.
- On error: shows the `ErrorScreen` with bilingual copy ("Something went wrong. Tap to try again. If it keeps happening, send us feedback.").
- Logs the error via `logger.error` (which scrubs PII and sends to Sentry).
- "Retry" button resets the boundary and re-renders.
- "Send feedback" button opens a mailto: with a redacted error code.

**Tests to write first:**

- Component test: throwing inside the boundary shows the fallback.
- Component test: retry button resets and shows children again.
- Component test: error is logged (mock the logger).

**Implementation notes:**

- Use the `react-error-boundary` library.
- Don't show stack traces to users — show an opaque error code (a short hash of the error message + timestamp). The user can include it in feedback; the founder can search Sentry for it.

**Self-review:**

- [ ] Both languages render.
- [ ] No PII in the user-visible error code.

**Done when:** all tests pass; manually throwing an error in dev shows the right screen.

---

## Task 3.10 — Splash and routing-decision logic

**Context:** Task 3.1; `.claude/skills/ui/SKILL.md` §6.

**Goal:** a polished splash that holds while we resolve auth state, then routes to the right group.

**Acceptance criteria:**

- `app/_layout.tsx` shows a splash while: fonts load, session restores, feature flags fetch, language detects.
- Splash is the Akin wordmark on the off-white background, dark fade to the app.
- Maximum splash duration: 3 seconds. After that, app boots with whatever state it has and the missing pieces fall back to defaults.
- Banned users see `BannedScreen` (not the splash, not the auth flow, not the main app). Login still works for data-export reasons.

**Tests to write first:**

- Component test: splash shows for ≤ 3s.
- Component test: with a valid session and active profile, app routes to `(main)`.
- Component test: with no session, app routes to `(auth)/welcome`.
- Component test: with a banned profile, app routes to `BannedScreen`.

**Implementation notes:**

- Use `expo-splash-screen` to hide the native splash once everything is ready.
- The "max 3 seconds" is a usability rule. Don't wait for slow networks.

**Self-review:**

- [ ] Banned-user path tested.
- [ ] Slow network tested (throttle in dev tools).

**Done when:** all four routing scenarios verified manually on iOS and Android.

---

## End of Phase 3

Sign-off ritual:

1. Run the deliverables checklist.
2. ADR entry: token choices, font choices, analytics anonymity choice.
3. Tag `phase-3-complete`.
4. Move to `phase-4-auth-onboarding.md`.
