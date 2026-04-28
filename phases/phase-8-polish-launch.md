# Phase 8 — Profile, settings, polish & launch

> **Goal:** the remaining user-facing surfaces (profile, settings), the accessibility audit, the performance pass, and the work to get the app through App Store and Google Play review for closed beta.
>
> **Estimated duration:** 5–8 days.
>
> **Prerequisites:** Phase 7 signed off.
>
> **Skills referenced:** `ui` (especially §4 a11y, §10 review checklist), `i18n`, `security`, `testing`.

---

## Phase deliverables — sign-off checklist

- [ ] Profile screen (self only): identifier, join date, my posts, my active conversations, basic stats.
- [ ] Settings screen with every required section (account, language, notifications, blocked users, legal, support).
- [ ] Dark mode toggle and full dark theme verified across every screen.
- [ ] Accessibility audit complete; every screen passes the helper.
- [ ] Performance pass: cold start < 2.5s, 60fps feed scroll, app size within budget.
- [ ] App Store + Play Store metadata, screenshots, privacy nutrition labels, review notes.
- [ ] First TestFlight production-profile build distributed to closed-beta cohort.

---

## Task 8.1 — Profile screen

**Context:** PRD §5.7; `.claude/skills/ui/SKILL.md`.

**Goal:** users see their own profile only. Identifier, join month, my posts list, my active conversations list.

**Acceptance criteria:**

- `app/(main)/profile.tsx`.
- Header: identifier in display type, "Joined [month/year]" caption.
- Tabs: "My Posts" / "My Active Conversations".
- "My Posts" — list of all posts I've created, sorted by recent. Reuses PostCard.
- "My Active Conversations" — posts I've commented on AND that are not yet full. Counts toward the 3-cap.
- Pull to refresh on each tab.
- Empty state per tab.

**Tests to write first:**

- Component test: header shows identifier and join month.
- Component test: My Posts tab loads from the right query.
- Component test: Active Conversations tab loads from the right query.
- Component test: empty states render correctly.

**Implementation notes:**

- "Active Conversations" query joins `comments` to `posts` filtering by `is_full = false` and `comments.author_id = auth.uid()`.
- v1 deliberately does not show optional stats (e.g. total posts created); add only if there's clear product value.
- No avatar, no bio. By design.

**Self-review (UX lens):**

- [ ] Both languages.
- [ ] Tap on a post → post detail.
- [ ] No way to view another user's profile.

**Done when:** all tests pass.

---

## Task 8.2 — Settings screen

**Context:** PRD §5.8; `.claude/skills/moderation/SKILL.md` (blocked users list).

**Goal:** every required settings entry, organised clearly.

**Acceptance criteria:**

- `app/(main)/settings.tsx`.
- Sections:
  - **Account**: masked email; change password (deep link to reset flow); delete account.
  - **Language**: sv / en toggle (writes to `profiles.language`, refreshes the i18n locale).
  - **Appearance**: light / dark / system.
  - **Notifications**: deferred — placeholder section "Coming soon" with explanation.
  - **Blocked users**: list with unblock action.
  - **Legal**: Privacy Policy, Terms of Service (open in in-app webview).
  - **Support**: app version, "Send feedback" mailto, FAQ (deferred placeholder for now).
  - **Sign out** (full-width button at the bottom).
  - **Moderator** (only visible if `is_moderator()`): link to `/moderator/queue`.

**Tests to write first:**

- Component test: each section renders.
- Component test: changing language updates i18n.
- Component test: changing theme updates the app.
- Component test: unblock from the blocked list invokes the right mutation.
- Component test: moderator-only entry hidden for non-moderators.
- Component test: sign-out invokes the logout flow.

**Implementation notes:**

- Use the OS-style settings list pattern: grouped rows, separators, chevrons.
- The version string comes from `expo-constants`.

**Self-review:**

- [ ] All copy bilingual.
- [ ] No PII in any entry.

**Done when:** all tests pass; manual review of every entry.

---

## Task 8.3 — Dark mode pass

**Context:** `.claude/skills/ui/SKILL.md` §9.

**Goal:** every screen looks deliberate in dark mode.

**Acceptance criteria:**

- Walk every screen in dark mode. Catalogue any contrast issues.
- Fix issues by adjusting tokens or adding `dark:` variants.
- Image assets that don't work on dark backgrounds get a dark-mode variant.
- Status bar and nav bar colours adapt to theme.

**Tests to write first:** snapshot tests for every screen in both themes (or visual regression with a tool like Chromatic if budget allows; for v1, manual is fine).

**Implementation notes:**

- Common offender: brand-soft backgrounds that look fine in light but get muddy in dark. Adjust `dark:` tokens.
- Spice flame colours need a dark-mode variant — the soft pink at flame 1 is too washed out on dark backgrounds.

**Self-review:**

- [ ] Screenshot every screen in both themes; review side-by-side.

**Done when:** founder is satisfied with both themes.

---

## Task 8.4 — Accessibility audit

**Context:** `.claude/skills/ui/SKILL.md` §4.

**Goal:** every screen passes the accessibility helper. Every interactive element has the right roles, labels, and hints.

**Acceptance criteria:**

- An automated pass: `pnpm test:a11y` runs the helper across every screen test, fails on any violation.
- Manual VoiceOver pass on iOS: walk every screen with VoiceOver on, every element is correctly labeled and navigable.
- Manual TalkBack pass on Android: same.
- Reduce-motion pass: enable system reduce-motion, every animation is skipped or instant.
- Dynamic type pass: set system text size to 130%, every screen still functions (no clipping, no truncation that hides info).

**Tests to write first:** the automated pass and per-screen tests are already in place from earlier phases. This task is about running and fixing.

**Implementation notes:**

- The `a11y-check` helper from `.claude/skills/ui/SKILL.md` §4 is the source of truth for automated checks.
- Common issues to look for: missing labels on icon-only buttons, low-contrast tertiary text in dark mode, text that's anchored with absolute positioning that breaks at large type sizes.

**Self-review:**

- [ ] All four manual passes documented as complete.
- [ ] Any deferred items are filed as v1.1 issues.

**Done when:** all checks green; founder has done VoiceOver and TalkBack passes.

---

## Task 8.5 — Performance pass

**Context:** `ARCHITECTURE.md` §9.

**Goal:** meet the performance budget on a mid-tier Android device.

**Acceptance criteria:**

- Cold start < 2.5s on a Pixel 5 (or equivalent).
- Feed scroll holds 60fps for 200+ items (use Reanimated's perf monitor).
- API p95 measured in PostHog for `feed_load`, `post_open`, `comment_post`.
- App size under 35MB iOS, 25MB Android.
- No image pulls more than 2x its display size.
- Lazy-load heavy modules (e.g. moderator dashboard).

**Tests to write first:**

- Performance regression test: a Maestro flow that times the cold start, fails if > 2.5s.
- Bundle-size CI check: fails if the iOS bundle grows past the budget.

**Implementation notes:**

- Run the app in a profiling build (`eas build --profile production`) to measure realistic cold start.
- Common quick wins: defer non-critical imports, downscale images, audit bundle with `npx expo-doctor` and `react-native-bundle-visualizer`.

**Self-review (performance lens):**

- [ ] All four budgets met.
- [ ] No big-O regression in any list.

**Done when:** budgets met, regression tests in place.

---

## Task 8.6 — Privacy policy & ToS

**Context:** GDPR + DSA compliance; not a coding task but tracked in this plan because it's blocking.

**Goal:** lawyer-reviewed privacy policy and terms of service, bilingual, accessible from Settings and from the signup screen.

**Acceptance criteria:**

- Privacy policy and ToS hosted on the marketing site (`akin.app/privacy`, `akin.app/terms`) and accessible in-app via the Legal section.
- Lists every sub-processor (Supabase, Sentry, PostHog, Resend, Apple, Google).
- Specifies lawful basis (Art. 6(1)(b) for service, Art. 6(1)(f) for moderation logs).
- Data retention policy documented (30-day grace + backup rolling cycle).
- Data subject rights endpoints documented (export, deletion, rectification).
- 18+ requirement clearly stated.
- DSA notice-and-action mechanism described.
- Both documents bilingual, lawyer-reviewed.

**Implementation notes:**

- Founder engages a Swedish privacy lawyer or DPO-by-day. Budget 25–60k SEK.
- The agent can draft a first pass for the lawyer to review, but the lawyer's word is final.
- ToS specifies governing law: Sweden, jurisdiction: Swedish courts.

**Done when:** lawyer has signed off; documents are live.

---

## Task 8.7 — App Store + Play Store metadata

**Context:** `.claude/skills/security/SKILL.md` §10.

**Goal:** complete store listings, screenshots, descriptions, privacy labels.

**Acceptance criteria:**

- App Store Connect listing complete in Swedish and English (primary territory: Sweden).
- Screenshots: 6.7" iPhone, 6.1" iPhone, iPad (if iPad supported in v1 — recommend NO for v1, mobile only).
- App Store privacy nutrition label declares: email (account), anonymous identifier (account), IP for rate limiting (linked to identity, not used for tracking), crash data (Sentry, not linked), analytics events (PostHog, not linked).
- App Store rating: 17+ (Mature/UGC).
- Review notes explicitly cite compliance with guideline 1.2 (UGC: filtering, reporting, blocking, and the moderator action mechanism).
- Test account credentials provided for review.
- Google Play Console: Data safety form, content rating IARC, target audience 18+.

**Implementation notes:**

- The screenshots should show: feed, post detail with comments, the create post screen with a category picker. NOT the limit-reached states (looks confusing without context).
- Don't use marketing hyperbole. The app's tone is calm; the listing should match.

**Done when:** both stores accept the metadata.

---

## Task 8.8 — Closed beta build

**Context:** all previous phases.

**Goal:** the first production-profile EAS build pushed to TestFlight and Play Internal Testing for the closed-beta cohort.

**Acceptance criteria:**

- `eas build --profile production --platform all` produces working binaries.
- Binaries uploaded to TestFlight and Play Internal Testing.
- Beta cohort (founder's hand-recruited 30–50 testers) invited.
- Feedback collection mechanism in place (in-app mailto + a Notion or Linear-equivalent issue tracker).
- Sentry + PostHog dashboards set up for the beta period.
- Sentry alerts configured: spike in errors, new error types, crash-free rate drops below 99%.

**Implementation notes:**

- Consider running the closed beta with `signups_open = false` and using invite codes for the cohort.
- An "invite code" doesn't need to be cryptographically secure for a closed beta — a 6-character shared code with a server-side counter is fine.

**Done when:** beta build is live, testers are using it, founder is reading their feedback daily.

---

## Task 8.9 — Pre-launch checklist

**Context:** before flipping to public launch.

**Goal:** the final go/no-go checklist before opening signups in Sweden.

**Acceptance criteria — every item must be ✅:**

- [ ] All Phase 1–7 deliverables complete.
- [ ] Privacy policy + ToS live and lawyer-approved.
- [ ] Closed beta ran for ≥ 4 weeks with positive qualitative signal and no Sev-1 incidents.
- [ ] Performance budget met on real devices.
- [ ] Sentry crash-free rate > 99.5% on the closed beta.
- [ ] Moderator dashboard tested under load (founder reviewed N reports per week without burning out).
- [ ] CSAM and credible-threat protocol tested (with a fake report — never with real CSAM).
- [ ] EAS Build production profile signed and ready for store release.
- [ ] App Store + Play Store review passed (or explicitly waiting on review at launch).
- [ ] Marketing site live (sv + en).
- [ ] Substack first post drafted.
- [ ] Founder personal stack: enough sleep, calendar cleared for launch week, support email monitored.

**Done when:** every item checked.

---

## Task 8.10 — Launch

**Goal:** flip `signups_open = true`, send the launch posts, watch the dashboards.

**Acceptance criteria:**

- `signups_open` set to true.
- Closed beta cohort migrated to the live database (or the closed beta WAS the live database — depends on the DB strategy).
- Substack post live, social posts up, PR pitches sent.
- Founder watching Sentry, PostHog, and the moderator queue in real time for the first 48 hours.
- A "go-live" tag committed.

**Done when:** the first 100 organic signups arrive. Then the work shifts from "build" to "operate." Future phases (v1.1+) live in a new plan.

---

## End of Phase 8

Sign-off ritual:

1. Deliverables checklist.
2. ADR entry: launch decisions, beta findings, any known issues to fix in v1.1.
3. Tag `v1.0.0` and push.
4. Take a Friday off. Open the Substack post on Monday. Repeat the cycle.

---

# After v1.0

This plan ends at public launch. The next 6 months of work live in a separate v1.1 / v1.2 / v2 plan to be drafted after launch, informed by real user behaviour. Likely priorities:

- Push notifications (transactional only).
- Edit / delete-mine (already supported in DB; the UI was scoped tight in v1).
- Simple keyword search.
- Weekly digest email + founder-curated weekly prompt.
- Premium tier (Stripe) and the freemium gate.
- Nordic expansion (DK, NO, FI).

But that's a different document. For now: ship.
