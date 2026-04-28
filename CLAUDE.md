# Akin — Agent Rules

> **You are an AI coding agent working on Akin. Read this file at the start of every session, before writing any code. The rules in this document are non-negotiable unless the user explicitly overrides one.**

---

## 1. What is Akin?

Akin is a Sweden-based, mobile-first, anonymous discussion app for people navigating modern dating. Users post short text discussions in 9 fixed categories. The defining product mechanic is **strict participation limits**: each post has at most 4 participants (1 OP + 3 commenters), and each user can be active in at most 3 non-full posts at once. The limits create scarcity, prevent pile-ons, and force conversation quality.

Read `ARCHITECTURE.md` for the system shape and `DECISIONS.md` for the running ADR log before any non-trivial change.

---

## 2. Non-negotiables

These rules apply to everything you produce. Violating them is a serious bug, not a style preference.

1. **Server-side enforcement, always.** The participation limits, content visibility rules, vote-once-per-post, and identifier uniqueness are enforced in Postgres (constraints + triggers + RLS). The client is never the source of truth for any invariant. If you find yourself writing client-side `if (commentCount < 3)` to gate behaviour, stop and move it to the database.
2. **RLS-first.** Every table has Row Level Security enabled with explicit policies. Default deny. No table ever ships without policies. No policy ever uses `USING (true)` outside of explicitly public read scenarios.
3. **TDD, no exceptions.** Write the failing test first. Then make it pass. Then refactor. The order is not negotiable. If you cannot write the test first, you do not understand the requirement well enough to implement it.
4. **No `any`. No `@ts-ignore`. No `eslint-disable`** without a code comment explaining why and a linked issue or task. Strict TypeScript everywhere.
5. **Bilingual from day one.** Every user-facing string lives in `src/i18n/{sv,en}.ts`. No hardcoded English. No hardcoded Swedish. The default locale is determined by device, falling back to Swedish.
6. **Accessibility is not optional.** Every interactive element has a label. Every screen passes the `a11y-check` test helper. Color contrast targets WCAG 2.2 AA across both themes.
7. **No PII in logs.** No emails, no IPs, no message content, no anonymous identifiers in Sentry/PostHog. Scrub before sending.
8. **Anonymity is structural, not cosmetic.** A user’s email and `auth.users.id` are never exposed via any API or RLS-readable column. Public reads only ever see the anonymous identifier.
9. **No third-party trackers.** No advertising SDKs. No fingerprinting. No analytics that link to identity.
10. **Critical paths get human review.** Auth flows, RLS policies, and (later) payments must be reviewed by a paid human expert before they ship to production. Mark these with the `// CRITICAL-PATH:` comment so the founder can find them.

---

## 3. Tech stack — pinned versions

Do not introduce new top-level dependencies without updating this list and `DECISIONS.md`.

| Layer        | Choice                                                             | Notes                                                                |
| ------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Framework    | Expo SDK 55+ on RN 0.83+ (New Architecture, bridgeless, Hermes V1) | New Architecture is mandatory.                                       |
| Language     | TypeScript, strict mode                                            | `strict: true`, `noUncheckedIndexedAccess: true`.                    |
| Routing      | Expo Router v4                                                     | File-based, deep linking on.                                         |
| Client state | Zustand 5                                                          | One store per feature slice.                                         |
| Server state | TanStack Query v5                                                  | All Supabase reads go through this.                                  |
| Styling      | NativeWind 5 (Tailwind for RN)                                     | Use design tokens, not raw colors. See `.claude/skills/ui/SKILL.md`. |
| Lists        | FlashList v2                                                       | Use for any list of unknown length.                                  |
| Animations   | Reanimated 4                                                       | UI-thread only. No JS-thread animations.                             |
| Forms        | React Hook Form + Zod                                              | Zod schemas live in `src/schemas/`.                                  |
| Backend      | Supabase (Postgres, Auth, Realtime, Edge Functions, Storage)       | EU region only.                                                      |
| Errors       | Sentry                                                             | Initialised once, in `src/lib/sentry.ts`.                            |
| Analytics    | PostHog (EU)                                                       | Behavioural only, never PII.                                         |
| Email        | Resend (EU)                                                        | Transactional only.                                                  |
| Tests        | Jest + React Native Testing Library + Maestro (E2E)                | See `.claude/skills/testing/SKILL.md`.                               |
| Build        | EAS Build / Submit / Update                                        | Three profiles: development, preview, production.                    |
| CI           | GitHub Actions                                                     | Tests + lint + type-check on every PR.                               |

---

## 4. Repo layout

```
akin/
├── app/                         # Expo Router routes (one folder per route)
│   ├── (auth)/                  # Unauthenticated routes
│   ├── (main)/                  # Authenticated routes (feed, post, profile, settings)
│   └── _layout.tsx              # Root layout
├── src/
│   ├── components/              # Reusable UI primitives + composed components
│   │   ├── primitives/          # Button, Text, Input — built on NativeWind
│   │   └── composed/            # PostCard, CommentItem, etc.
│   ├── features/                # Feature slices: auth, feed, post, profile, moderation
│   │   └── <feature>/
│   │       ├── api/             # TanStack Query hooks for this feature
│   │       ├── components/      # Components only used by this feature
│   │       ├── store/           # Zustand store slice
│   │       ├── schemas/         # Zod schemas
│   │       └── __tests__/       # Tests for this feature
│   ├── lib/                     # Cross-cutting infrastructure
│   │   ├── supabase.ts          # Single client instance
│   │   ├── sentry.ts
│   │   ├── posthog.ts
│   │   └── i18n.ts
│   ├── i18n/                    # Translation strings
│   │   ├── sv.ts
│   │   └── en.ts
│   ├── theme/                   # Design tokens
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   └── typography.ts
│   └── types/                   # Generated Supabase types + shared types
├── supabase/
│   ├── migrations/              # SQL migrations, numbered, never edited after merge
│   ├── functions/               # Edge Functions (Deno)
│   ├── tests/                   # pgTAP tests for RLS and triggers
│   └── seed.sql                 # Local dev seed data
├── e2e/                         # Maestro flows
├── .claude/
│   └── skills/                  # Context-triggered guidance for the agent
├── ARCHITECTURE.md              # Read at start of every session
├── DECISIONS.md                 # Append-only ADR log
└── CLAUDE.md                    # This file
```

**Naming.** `PascalCase.tsx` for components. `camelCase.ts` for utilities and hooks. `kebab-case` for route folders. SQL files: `NNNN_description.sql` where NNNN is a 4-digit zero-padded number.

**Co-location.** Tests live next to the code they test in a `__tests__` folder. Schemas live in the feature that owns them. Components used in only one feature live inside that feature, not in `src/components`.

---

## 5. Task workflow

Every task you take on follows this exact flow. Skipping a step produces sloppy work.

### Step 1 — Read

- Read `CLAUDE.md` (this file).
- Read `ARCHITECTURE.md`.
- Read any `.claude/skills/*/SKILL.md` files relevant to the task. Examples:
  - Touching SQL or RLS → `database/SKILL.md`.
  - Touching UI → `ui/SKILL.md`.
  - Writing tests → `testing/SKILL.md`.
  - Touching strings → `i18n/SKILL.md`.
  - Touching anything that handles user input or auth → `security/SKILL.md`.
- Skim recent entries in `DECISIONS.md` so you don’t contradict a previous decision.

### Step 2 — Plan

Write a short plan and present it to the founder before writing code. The plan must include:

- The acceptance criteria, restated in your own words.
- The list of files you will create or modify.
- The list of tests you will write first.
- Any open questions or assumptions.

Do not start implementing until the founder confirms the plan. If the task brief is ambiguous, ask before guessing.

### Step 3 — Implement (TDD)

- Write the failing test first (red).
- Write the minimum code to make it pass (green).
- Refactor without changing behaviour (refactor).
- Repeat for the next slice of behaviour.

If a test is hard to write, the design is wrong. Stop and rethink the interface.

### Step 4 — Self-review

Before marking the task done, walk through `.claude/skills/security/SKILL.md` Section 5 (the four-lens review). The four lenses are:

1. **Security** — auth checks, RLS, input validation, secrets handling.
2. **Data** — correct tables, indexes, RLS policies, no orphan rows.
3. **UX** — design tokens used, accessibility verified, error and empty states present, both languages.
4. **Performance** — no N+1, proper memoisation, FlashList where applicable, no synchronous heavy work on the JS thread.

### Step 5 — Update docs

If the task changed architecture, add an entry to `DECISIONS.md` (use the template at the top of that file). If you added a new top-level dependency or pattern, update `ARCHITECTURE.md` accordingly.

---

## 6. What you do NOT do without explicit permission

- Add a new top-level npm dependency. (Update `DECISIONS.md` and ask first.)
- Change a database migration that has been merged. (Write a new migration instead.)
- Disable a test. (Fix the test or fix the code. Never `.skip`.)
- Touch `supabase/migrations/` files that are older than the most recent one.
- Add a third-party SDK. (Especially analytics, ads, or social SDKs.)
- Use `localStorage`, `AsyncStorage` directly, or any persistence layer for sensitive data. (Use `expo-secure-store` for tokens; everything else through the Supabase client.)
- Bypass the Supabase client and call the REST endpoint directly.
- Hardcode any string a user will see. (Always go through i18n.)
- Use raw colors (`#aabbcc`) outside `src/theme/colors.ts`.
- Write `useEffect` chains that fetch data. (Use TanStack Query.)
- Add a console.log to production code. (Use the logger in `src/lib/logger.ts`, which scrubs PII.)
- Disable or weaken an RLS policy.
- Modify the participation-limit triggers without writing pgTAP tests first.

---

## 7. The participation-limit invariants

These are the heart of the product. Treat them as sacred.

**Per-post invariant:** A post has at most 4 participants — 1 original poster + at most 3 unique additional commenters. Each of the 4 can comment any number of times once admitted.

**Per-user invariant:** A user is "active" in at most 3 posts at once. A user is active in a post if they have commented and the post is not yet at 4 participants. Once a post reaches 4 participants, every active commenter (including the OP) gets a free slot back.

**Enforcement.** Both invariants are enforced by Postgres triggers using row-level locking (`SELECT ... FOR UPDATE`) inside a serializable transaction. The client never validates these. The client only displays the state and surfaces errors from the server. See `.claude/skills/database/SKILL.md` Section 4 for the trigger pattern.

**Violation symptoms.** If you ever see a post with 5 participants, a user active in 4 conversations, or a duplicate spice vote, treat it as a Sev-1 bug. Stop other work, write the regression test, fix the trigger.

---

## 8. Anonymity discipline

The anonymous identifier (e.g. `CrimsonFox42`) is what other users see. The `auth.users.id` and `email` are never exposed in any read path.

- Posts and comments include `originalPosterAnonymousIdentifier` / `userAnonymousIdentifier` as denormalised columns. Reads use these. Writes still use `auth.uid()` for ownership checks.
- The `auth.users` table is never directly readable from the client.
- Reports include the reporter’s `auth.uid()` for accountability, but the reporter’s identifier is never shown to anyone except the moderator dashboard.
- When you write an RLS policy that joins to `auth.users`, ask yourself: could this leak the email? If unsure, don’t join — denormalise the identifier instead.

---

## 9. Communication with the founder

- Surface uncertainty early. "I’m not sure whether X" is more useful than guessing and shipping a bug.
- When you encounter ambiguity, list the options with trade-offs. Don’t just ask "what do you want?".
- Estimates are ranges, not points. "30 minutes to 2 hours" is honest. "1 hour" is fake precision.
- If a task is taking more than 2x the estimate, stop and explain why.
- Flag anything that smells like scope creep. The founder can decide whether to absorb it or defer it.

---

## 10. The kill-switches

Three things give the founder a way to stop a fire fast. Treat these as load-bearing infrastructure.

1. **Feature flags.** Every new feature ships behind a flag stored in a `feature_flags` Postgres table, read on app start. Flags are server-controlled. Default OFF for anything user-facing not yet validated.
2. **Invite-only mode.** A global `signups_open` flag. When false, signup attempts return a "we’re full right now" message. Used during App Store review and in the event of a moderation overload.
3. **Posting freeze.** A global `posting_open` flag. When false, post and comment creation is disabled with a friendly message. Used during incidents.

When you build a new feature, wire it to a flag. When you build infrastructure, ask whether it needs a kill-switch.

---

## 11. Reference documents

Full PRD: `docs/Akin_PRD_v1.2.md` — reference when implementing specific screens or data schemas.
Strategy: `docs/Akin_Strategy_v1.0.md` — context only; not required for implementation tasks.

---

## End of CLAUDE.md
