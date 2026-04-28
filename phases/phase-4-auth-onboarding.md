# Phase 4 — Auth & onboarding

> **Goal:** users can sign up, verify email, see their anonymous identifier reveal, complete onboarding, and log in/out reliably. Banned and suspended users see the right screens.
>
> **Estimated duration:** 5–7 days.
>
> **Prerequisites:** Phase 3 signed off.
>
> **Skills referenced:** `ui`, `i18n`, `security` (especially §4 auth flow), `testing`.

---

## Phase deliverables — sign-off checklist

- [ ] Welcome screen → signup → email verification → identifier reveal → onboarding → feed.
- [ ] Login flow with password reset.
- [ ] 18+ age gate at signup, captured to `profiles.age_verified_at`.
- [ ] Logout clears session and Zustand state.
- [ ] Account deletion flow (multi-step confirmation, soft-delete with 30-day purge job).
- [ ] Banned user screen with data-export option.
- [ ] Suspended user screen with countdown.
- [ ] First Maestro E2E flow green: full signup → first feed view.

---

## Task 4.1 — Welcome screen

**Context:** `.claude/skills/ui/SKILL.md` §1 (design language), `.claude/skills/i18n/SKILL.md`.

**Goal:** the first screen a non-authenticated user sees. Sets the tone — calm, warm, clear.

**Acceptance criteria:**

- `app/(auth)/welcome.tsx` route.
- Displays the Akin wordmark, the tagline ("Connect with no names" / Swedish translation), a one-paragraph description.
- Two buttons: "Sign up" and "I have an account".
- Bilingual; defaults to system language with a small language toggle in the corner.
- No external links yet (legal links come on the signup screen).

**Tests to write first:**

- Component test: renders both buttons with correct accessibility roles.
- Component test: tapping "Sign up" navigates to `(auth)/signup`.
- Component test: tapping "I have an account" navigates to `(auth)/login`.
- Component test: language toggle changes visible text.
- a11y check passes.

**Implementation notes:**

- Use `Text` primitive variant `display` for the wordmark.
- Subtle fade-in on first render (200ms), respecting reduced motion.

**Self-review:**

- [ ] Both languages.
- [ ] Both themes.
- [ ] No hardcoded copy.

**Done when:** all tests pass; visual review on iOS + Android, light + dark, sv + en.

---

## Task 4.2 — Signup form

**Context:** `.claude/skills/security/SKILL.md` §3, §4; `.claude/skills/ui/SKILL.md` §8 (forms).

**Goal:** email + password + 18+ checkbox form, validated client-side, submits to Supabase Auth, lands the user on the email verification screen.

**Acceptance criteria:**

- `app/(auth)/signup.tsx` route.
- Form fields: email, password, confirm password, 18+ checkbox, language pre-selected from device default.
- Zod schema in `src/features/auth/schemas/signup.ts`:
  - email: valid format
  - password: min 8 chars
  - confirmPassword: equals password
  - ageConfirmed: must be true
- Submit calls `supabase.auth.signUp({ email, password, options: { data: { language, age_verified_at: now } } })`.
- After successful signup, navigate to `(auth)/verify-email`.
- Errors mapped to bilingual messages: `email_invalid`, `password_too_short`, `passwords_do_not_match`, `age_not_confirmed`, `email_already_in_use`, `network_error`.
- Links to Privacy Policy and Terms (open in-app webview, not external browser).

**Tests to write first:**

- Form test: invalid email shows the right error.
- Form test: short password shows the right error.
- Form test: mismatched passwords shows the right error.
- Form test: unchecked 18+ shows the right error.
- Form test: valid form submits to Supabase and navigates.
- Form test: `email_already_in_use` server error is mapped to a bilingual user-friendly message.
- a11y check passes (errors announced).

**Implementation notes:**

- Don't reveal whether an email exists in the database. The error message for "already exists" is the same as a generic submission failure ("If your email was unrecognised or already in use, you'll get an email shortly"). This is privacy hygiene.
- Actually — we DO need to tell them, otherwise the UX is confusing. Compromise: distinguish "email already in use" but NEVER reveal "email not found" on login. Document in `DECISIONS.md`.
- Capture `age_verified_at` server-side via the auth-trigger, not by trusting the client. The signup form sends an `age_confirmed: true` flag in user metadata; the trigger stamps `now()` only if that flag is true.
- Add `// CRITICAL-PATH: auth` markers.

**Self-review (security lens):**

- [ ] Password never logged.
- [ ] No PII in analytics events.
- [ ] Age gate is a real check, not just a UI checkbox.
- [ ] Server-side validation matches client-side.

**Done when:** signup with a fresh email creates an `auth.users` row + `profiles` row with `age_verified_at` set.

---

## Task 4.3 — Email verification screen

**Context:** `.claude/skills/security/SKILL.md` §4.

**Goal:** the user is told an email was sent, can resend, can change email if they typed wrong.

**Acceptance criteria:**

- `app/(auth)/verify-email.tsx` route.
- Shows a friendly message: "Check your inbox for a verification link."
- "Resend email" button (rate-limited: max once per 60 seconds; surface a countdown).
- "Wrong email?" link → returns to signup with the email pre-filled.
- Polls `supabase.auth.refreshSession()` every 5 seconds. When `email_confirmed_at` is set, navigate to identifier reveal.
- Sign out option (in case the user wants to use a different email entirely).

**Tests to write first:**

- Component test: shows the user's email (masked: `j***@example.com`).
- Component test: resend button is disabled for 60s after a click.
- Component test: navigates to identifier reveal once `email_confirmed_at` becomes truthy.
- Component test: "Wrong email?" navigates back to signup with email pre-filled.

**Implementation notes:**

- Use Resend (configured in Phase 2) for the email transport. The template is set in Supabase Auth settings.
- Email subject and body bilingual based on the user's `profiles.language`.
- Polling interval: 5s while screen is focused, paused when blurred.

**Self-review:**

- [ ] Mask email correctly.
- [ ] No PII in logs.
- [ ] Polling stops when navigating away.

**Done when:** signup flow ends here with a real email arriving in inbox; clicking the link transitions the user automatically.

---

## Task 4.4 — Identifier reveal screen

**Context:** `ARCHITECTURE.md` §3 (identity hierarchy); `.claude/skills/ui/SKILL.md` §6 (animations).

**Goal:** a memorable moment where the user learns their anonymous name. Calm, warm, not gamified.

**Acceptance criteria:**

- `app/(auth)/identifier-reveal.tsx` route.
- Shows the identifier (e.g. `CrimsonFox42`) in display typography, large.
- One-paragraph explanation: "This is your name in Akin. Other people see this — never your email. You can't change it."
- "Continue" button → navigates to onboarding.
- Subtle fade-in for the identifier (300ms, reduced-motion aware).

**Tests to write first:**

- Component test: fetches the identifier from the user's profile.
- Component test: shows a loading skeleton while fetching.
- Component test: shows an error state (with retry) if the fetch fails.
- Component test: continue button navigates to `(auth)/onboarding`.

**Implementation notes:**

- The identifier might still be `pending_NNN` if the Edge Function from Phase 2 hasn't completed. If so, poll the profile every 1s for up to 10s; show a "preparing your name" loading state. After 10s, surface an error and offer to retry.
- This is the only screen where the identifier is presented as ceremonial. Everywhere else it's just a display name.

**Self-review:**

- [ ] No way to skip this screen and miss the identifier.
- [ ] No way to choose or change it (intentional).

**Done when:** post-verification, the user lands here and sees their real (non-pending) identifier.

---

## Task 4.5 — Onboarding screens

**Context:** `.claude/skills/ui/SKILL.md` §1 (calm over loud).

**Goal:** a 3-screen explainer of the Akin model — anonymity, the 4-participant limit, the categories. Skippable.

**Acceptance criteria:**

- `app/(auth)/onboarding.tsx` with horizontal pager (3 screens).
- Screen 1: "Anonymous, by design" — explains the identifier, no profile photos, no DM.
- Screen 2: "Small conversations" — explains 4 participants per post, 3 active at once.
- Screen 3: "9 categories, no algorithm" — quick visual of the categories.
- "Skip" button on every screen → goes to feed.
- "Next" / "Get started" on the last screen.
- After completion, sets `profiles.onboarded_at` to `now()` so the screens never appear again.

**Tests to write first:**

- Component test: pager has 3 screens.
- Component test: skip on any screen navigates to feed.
- Component test: completing all 3 sets `onboarded_at` and navigates to feed.

**Implementation notes:**

- Add `onboarded_at timestamptz` to `profiles` in a small migration (Phase 4, since it's auth-related, with a CRITICAL-PATH marker).
- The root layout in `(main)/_layout.tsx` redirects to onboarding if `onboarded_at` is null. (After this phase, that redirect is in place.)

**Self-review (UX lens):**

- [ ] Skippable everywhere.
- [ ] Bilingual.
- [ ] Doesn't reappear after completion.

**Done when:** new user flows from signup → verify → identifier → onboarding → feed.

---

## Task 4.6 — Login form

**Context:** Task 4.2 patterns reused.

**Goal:** existing users sign in.

**Acceptance criteria:**

- `app/(auth)/login.tsx` route.
- Email + password form with the same Zod patterns.
- "Forgot password?" link → `(auth)/reset-password`.
- "Don't have an account?" link → `(auth)/signup`.
- On success: navigate to feed (or onboarding if not yet onboarded, or banned screen if banned).
- On failure: a generic "Email or password incorrect" message — never reveal which one is wrong.
- Rate-limit aware: after 5 failed attempts, show a "try again in N minutes" message.

**Tests to write first:**

- Form test: invalid credentials show the generic error.
- Form test: 6th rapid attempt shows the rate-limit message.
- Form test: successful login navigates based on user state (banned → ban screen; not onboarded → onboarding; otherwise → feed).
- a11y check.

**Implementation notes:**

- The rate limit is enforced by Supabase Auth; we just surface the response.
- Add CRITICAL-PATH marker.

**Self-review:**

- [ ] Generic error message.
- [ ] No timing differences that hint whether an email exists.
- [ ] Rate limit visible to user.

**Done when:** all tests pass.

---

## Task 4.7 — Password reset flow

**Context:** Task 4.6 patterns.

**Goal:** users can reset a forgotten password.

**Acceptance criteria:**

- `app/(auth)/reset-password.tsx` (request screen): email input → submit → "Check your email."
- `app/(auth)/reset-confirm.tsx` (deep-linked from email): new password + confirm.
- Success → automatic login + navigate to feed.
- Generic feedback: "If we have an account for that email, you'll receive a reset link" (don't confirm/deny existence).

**Tests to write first:**

- Component test: request form submits and shows the generic message.
- Component test: confirm form requires matching passwords with min 8 chars.
- Component test: successful confirm logs the user in and navigates to feed.

**Implementation notes:**

- Deep link scheme: `akin://reset-confirm?token=...` — handled by Expo Router.
- Email template configured in Supabase Auth settings.

**Self-review:**

- [ ] Generic responses.
- [ ] CRITICAL-PATH marker.

**Done when:** request → email → tap link → set new password → logged in.

---

## Task 4.8 — Logout

**Context:** Task 3.5 (Supabase client).

**Goal:** logout clears session, secure storage, Zustand state, and TanStack Query cache.

**Acceptance criteria:**

- `useLogout()` hook in `src/features/auth/api/`.
- Calls `supabase.auth.signOut()`.
- Clears every Zustand slice (write a `resetAllStores()` helper).
- Calls `queryClient.clear()` to drop cached server data.
- Navigates to `(auth)/welcome`.
- A "Logout" button in Settings (built in Phase 8) and on the BannedScreen.

**Tests to write first:**

- Hook test: calling logout invokes `signOut`, `resetAllStores`, and `queryClient.clear`.
- Hook test: navigates to `welcome` afterward.

**Implementation notes:**

- `resetAllStores()` lives in `src/lib/store-utils.ts` and iterates a registered list of Zustand stores. Each store registers itself on creation.

**Self-review (security lens):**

- [ ] No user-derived data lingers in memory after logout.
- [ ] Secure-store keys cleared.

**Done when:** logging out then logging back in as a different user shows no data from the previous session.

---

## Task 4.9 — Account deletion flow

**Context:** GDPR compliance — data subject right to erasure.

**Goal:** users can delete their account. The deletion is soft (status = 'deleted') with a 30-day grace period before hard purge by a scheduled job.

**Acceptance criteria:**

- "Delete account" entry in Settings (Phase 8 wires it; Phase 4 builds the flow).
- Multi-step confirmation: warning screen → typed confirmation ("delete my account") → password re-entry → final confirm.
- On confirm: profile status set to `deleted`, posts and comments status set to `deleted`, audit log entry written.
- The user is signed out and shown a "Your account has been deleted. It will be fully removed within 30 days." screen.
- A scheduled Edge Function (`scheduled-purge`) runs nightly and hard-deletes profiles with `status = 'deleted' AND deleted_at < now() - interval '30 days'`.

**Tests to write first:**

- Component test: each confirmation step blocks proceeding until completed.
- Component test: bad password re-entry shows an error.
- Integration test (against local Supabase): on full confirm, profile status = 'deleted' and audit_log row written.
- Edge Function test: purge job removes accounts older than 30 days, leaves newer ones alone.

**Implementation notes:**

- Add `deleted_at timestamptz` to `profiles` in a Phase-4 migration.
- The scheduled function uses Supabase's pg_cron extension, configured in a migration.
- During the 30-day grace period, the user can email support to recover the account. Document this in the Privacy Policy.
- Add CRITICAL-PATH marker (privacy + auth).

**Self-review (security lens):**

- [ ] Password re-entry tested.
- [ ] Audit log written.
- [ ] No way to delete someone else's account.

**Done when:** integration test passes; manual flow on a real device works.

---

## Task 4.10 — Banned & suspended user screens

**Context:** `.claude/skills/moderation/SKILL.md` §7 (account lifecycle).

**Goal:** banned and suspended users see explanatory screens.

**Acceptance criteria:**

- `BannedScreen` (under `(main)/banned.tsx` route): explains the ban, offers data export and account deletion, sign-out button. No way to reach the feed.
- `SuspendedScreen` (under `(main)/suspended.tsx`): shows countdown to `suspended_until`, brief reason text, sign-out button.
- The root layout reads `profiles.status` and routes here automatically.
- Suspended status auto-clears once `suspended_until < now()`. The user is taken back to the feed on next app open.

**Tests to write first:**

- Routing test: profile status `'banned'` → BannedScreen.
- Routing test: profile status `'suspended'` AND `suspended_until > now()` → SuspendedScreen.
- Routing test: profile status `'suspended'` AND `suspended_until < now()` → main app (status auto-cleared).

**Implementation notes:**

- Auto-clear is done by a database trigger or a server-side check on profile fetch (cleaner: server-side check, returning the effective status).
- The countdown updates every minute, not every second (battery-friendly).

**Self-review:**

- [ ] Banned users cannot post or comment (already enforced by RLS in Phase 2; verify here).
- [ ] Both languages.

**Done when:** all routing scenarios pass.

---

## Task 4.11 — Maestro E2E: signup smoke flow

**Context:** `.claude/skills/testing/SKILL.md` §9.

**Goal:** the first end-to-end smoke flow passes — proves the whole signup chain works.

**Acceptance criteria:**

- `e2e/signup.yaml` flow: launch → welcome → signup → (verify email — mock the deep link in dev) → identifier reveal → skip onboarding → feed.
- Runs locally on iOS simulator and Android emulator.
- Documented in `e2e/README.md`.

**Tests to write first:** the flow itself.

**Implementation notes:**

- Email verification in dev uses a Supabase auth setting that auto-confirms emails (only on local/staging, never production).
- For CI, this flow runs only on release branches, not every PR.

**Done when:** flow green on both platforms.

---

## End of Phase 4

Sign-off ritual:

1. Deliverables checklist.
2. ADR entry: deletion grace period choice (30 days), email-existence policy.
3. First TestFlight + Play Internal Testing build pushed. Self-test as the founder before moving on.
4. Tag `phase-4-complete`.
5. Move to `phase-5-feed-posts.md`.
