# Akin — Architecture Decision Record

> Append-only log of non-trivial decisions. Newest at the top. Never edit a previous entry — supersede it with a new one.

## Format

```
## ADR-NNN — Short title
Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by ADR-XXX
Decided by: Founder | Founder + advisor name

### Context
What problem are we solving? What constraints are in play?

### Options considered
1. Option A — pros / cons
2. Option B — pros / cons
3. Option C — pros / cons

### Decision
What we chose and why.

### Consequences
What this makes easier. What this makes harder. What we'll need to revisit.
```

When you make a non-obvious choice — picking a library, structuring a query, designing an RLS pattern — write an ADR. Future-you and the next agent session will thank you.

---

## ADR-017 — Feed preference persistence: AsyncStorage via Zustand `persist`

Date: 2026-05-19
Status: Accepted
Decided by: Founder

### Context

Task 5.8 requires the user's chosen feed sort and category filter to persist across app launches. The data is non-sensitive (no PII, just UI preference) so encrypted storage is overkill. Phase 5 introduced `useFeedStore` (Zustand) with `sort`, `minSpice`, `activeCategory` — previously in-memory only.

### Options considered

1. **`expo-secure-store`** — already a dependency. Encrypted; intended for tokens. Overkill for a sort dropdown; not designed for arbitrary JSON payloads. iOS keychain has a documented size limit (~4KB per entry) and slow access.
2. **`@react-native-async-storage/async-storage`** — community-standard plaintext key/value store, Expo-supported, the recommended persistence backend for Zustand's `persist` middleware. New top-level dependency.
3. **Server-side preference column on `profiles`** — needs a migration, a write on every sort change, and adds latency. Wrong fit for a screen-local UI knob.

### Decision

Install `@react-native-async-storage/async-storage` and wire it to `useFeedStore` via Zustand `persist` + `createJSONStorage`. The same backend powers a new `useUiPrefsStore` for the one-shot "has seen create-post guidelines" flag.

Storage keys:

- `akin.feedPrefs.v1` — sort, minSpice, activeCategory
- `akin.uiPrefs.v1` — hasSeenCreateGuidelines

The `v1` suffix lets us bump the key when the shape changes rather than writing JSON-migration code.

### Consequences

- ✅ Standard, well-supported persistence for non-sensitive prefs across both platforms.
- ✅ `partialize` ensures only data fields persist, not action methods.
- ⚠️ Adds one runtime dep. Sentry/PostHog and most RN apps already pull it transitively.
- ⚠️ AsyncStorage is plaintext. We must never persist anything sensitive here — tokens stay in `expo-secure-store`. Code review must enforce that boundary.

---

## ADR-016 — Feed pagination: cursor over offset

Date: 2026-05-19
Status: Accepted
Decided by: Founder

### Context

Phase 5 Task 5.1 specified cursor-based pagination for the feed query, but the initial implementation used `.range(offset, offset+20)`. With offset pagination, any insert between page fetches shifts every subsequent row by one — the user sees the same post twice (or skips one) when scrolling. The feed is publicly writable, so inserts during a scroll session are routine, not an edge case.

### Options considered

1. **Offset pagination (`.range(start, end)`)** — trivial to implement; PostgREST built-in. Suffers from row shifting on concurrent inserts. Late inserts at the top push everything down and corrupt the cursor.
2. **Cursor on `(sort_column, id)`** — stable under concurrent inserts: each page is defined by "the row immediately past `(value, id)`," not "rows N through N+20." Slightly more code; needs an `id` tiebreaker because `created_at` / `comment_count` / `average_spice_level` are not unique.
3. **Realtime subscription + local merge** — overkill for a feed surface where the product model is pull-to-refresh, not push.

### Decision

Cursor pagination keyed on `(sort_column, id)` with strict-less-than tuple comparison via PostgREST `or=(col.lt.X,and(col.eq.X,id.lt.Y))`. The `id` tiebreaker guarantees a total order even when the primary sort column has duplicates.

For `spice` (DESC NULLS LAST), the cursor's value can be `null`. When that happens, all remaining rows are also `null` (NULLS LAST), so we degrade to a simple `is(col, null).lt(id, cursor.id)` predicate for subsequent pages.

### Consequences

- ✅ Stable pagination — late inserts no longer corrupt the user's scroll.
- ✅ Plays cleanly with the existing indexes on `(created_at, id)`, `(comment_count, id)`, `(average_spice_level, id)`.
- ⚠️ `getNextPageParam` now returns a `{ value, id } | null` instead of a number — slightly more memory per page, but trivial.
- ⚠️ Tests must mock `or` / `is` / `lt` / `limit` instead of `range`. Test helpers updated accordingly.

---

## ADR-015 — Account deletion: 30-day soft-delete with pg_cron purge

Date: 2026-05-18
Status: Accepted
Decided by: Founder

### Context

GDPR Article 17 (right to erasure) requires the ability to delete a user account and associated personal data. We need a deletion flow that is genuinely irreversible but also allows for a brief grace period (error recovery, App Store requirement to show the path is real).

### Options considered

1. **Immediate hard delete** — call `supabase.auth.admin.deleteUser()` at the moment the user confirms. Simple, but no grace period; App Store guidelines for 4.2 require the deletion to actually happen.
2. **Soft delete only** — mark `status = 'deleted'`, never actually purge. Violates GDPR erasure.
3. **30-day soft delete + nightly purge** — mark `status = 'deleted'` and `deleted_at = now()` immediately; a pg_cron job purges (calling `auth.admin.deleteUser()`) after 30 days. GDPR compliant, App Store compliant, provides an accidental-deletion safety net.

### Decision

Option 3. A Supabase Edge Function (`scheduled-purge`) is invoked nightly by pg_cron, fetches profiles with `status = 'deleted' AND deleted_at < now() - interval '30 days'`, and calls `auth.admin.deleteUser()` for each. The function is protected by a shared secret (`SCHEDULED_PURGE_SECRET`). The 30-day window is clearly disclosed in the in-app deletion flow.

### Consequences

- Easier: meets GDPR + App Store requirements without a complex undo flow.
- Harder: the pg_cron extension must be enabled in Supabase (it is in Pro plan). The secret must be rotated as part of security hygiene.
- Revisit: if we ever need real-time erasure (unlikely for a social app), we'd switch to immediate hard-delete or a webhook trigger.

---

## ADR-014 — Password reset: generic response regardless of email existence

Date: 2026-05-18
Status: Accepted
Decided by: Founder

### Context

When a user requests a password reset, naive implementations confirm whether the submitted email exists in the system. This is an account enumeration vulnerability: an attacker can discover which emails are registered.

### Options considered

1. **Expose the error** — show "No account found for that email." Leaks registration state.
2. **Generic response always** — always say "If that email is registered, you'll receive a link." Never confirm or deny existence.

### Decision

Option 2. `requestPasswordReset()` in the auth store ignores the Supabase error when the email isn't found and returns without setting `error` state. The UI always shows the same generic success message. This matches how Supabase's own auth dashboard behaves.

### Consequences

- Easier: no account enumeration.
- Harder: users with a typo in their email get no feedback. Acceptable trade-off for an anonymous app where the email is private anyway.

---

## ADR-013 — Onboarding: onboarded_at column instead of deriving from anonymous_identifier

Date: 2026-05-18
Status: Accepted
Decided by: Founder

### Context

Phase 3 implied onboarding completion by checking whether `anonymous_identifier` was set and non-pending. This is fragile: it ties two concerns together (identifier generation and onboarding completion) and makes the routing logic hard to reason about.

### Options considered

1. **Derive from anonymous_identifier** — `onboarding_complete = identifier is set and not pending`. Fragile; breaks if identifier generation is retried.
2. **Explicit `onboarded_at` column** — a nullable `timestamptz` that is set when the user taps "This is me" and completes the 3-screen onboarding pager. Null means not yet onboarded.

### Decision

Option 2. Migration `0013_add_onboarded_at.sql` adds `onboarded_at timestamptz` to `profiles`. `completeOnboarding()` in the auth store writes `onboarded_at = now()`. `routeAfterSignIn()` checks this column first, then falls back to identifier state for the identifier reveal screen.

### Consequences

- Easier: routing logic is explicit and readable. Onboarding can be reset for A/B tests by nulling the column.
- Harder: one more column to carry in the Profile type and seed data.

---

## ADR-012 — PostHog analytics: anonymous distinct ID, EU host, no identity linkage

Date: 2026-05-18
Status: Accepted
Decided by: Founder

### Context

Task 3.8 wires PostHog EU as the behavioural analytics backend. PostHog requires a stable `distinct_id` per device/user to group events into sessions. The choice of how to generate and store that ID carries privacy and anonymity implications that are central to Akin's product identity.

### Options considered

1. **Use `auth.uid()` as the distinct ID** — trivial to implement; allows cross-referencing analytics events with database records. Violates Akin's anonymity guarantee (Rule 8): auth.uid() is an internal identity anchor. PostHog support engineers with project access could, in theory, correlate user behaviour with account data. ✗

2. **Generate a random UUID per device, persisted in `expo-secure-store`** — distinct from auth.uid(); survives app restarts; lost on uninstall (acceptable — analytics sessions do not need to span reinstalls). Cannot be correlated with auth.uid() at rest. ✓

3. **Use a per-session UUID (in-memory only)** — simpler but sessions split every app restart, making funnel analysis impossible. ✗

### Decision

Option 2. `getDistinctId()` in `src/lib/analytics.ts` generates a RFC 4122 v4 UUID on first call, persists it under the key `posthog_distinct_id` in `expo-secure-store`, and returns the stored value on all subsequent calls. The function accepts no argument — there is no code path that could pass an external user ID. This is enforced structurally, not by convention.

Additional constraints applied:

- EU data residency: `host: 'https://eu.posthog.com'`
- Session replay: `enableSessionReplay: false` (no screen recordings)
- PII scrubbing: all event props pass through `scrub()` from `src/lib/logger.ts` before capture

### Consequences

- Analytics sessions survive app restarts but not reinstalls — acceptable for behavioural analytics.
- PostHog data cannot be joined to Supabase user records without manual cross-referencing, which requires access to both systems and is therefore an auditable action.
- The anonymity guarantee (CLAUDE.md Rule 8) is preserved in the analytics layer.
- If we ever need to persist analytics identity across reinstalls we would need a server-generated opaque token — revisit this ADR at that point.

---

## ADR-011 — Phase 2: database schema, triggers, and pgTAP suite

Date: 2026-05-17
Status: Accepted
Decided by: Founder

### Context

Phase 2 delivers the full Postgres backend: 12 migrations (profiles → participation limits → spice votes → content filter → audit log → blocks → feature flags → user roles → reports → identifier words → Edge Function plumbing → seed data), 13 pgTAP test files (76 assertions), and generated TypeScript types. Four non-obvious decisions are recorded below.

### Decision 1 — SECURITY DEFINER + current_user guard for internal triggers

**Problem.** Several triggers update server-managed columns (e.g. `active_post_count`, `comment_count`, `participant_count`). Guard triggers block `authenticated` clients from writing those columns directly. But when an internal trigger fires (e.g. `add_op_as_participant` increments `active_post_count`), it runs in the same session and would be blocked by the guard — causing a recursive failure.

**Options considered.**

1. GUC flag (`set_config('akin.internal', 'true', true)`) — clients could set the same flag and bypass guards. ✗
2. SECURITY DEFINER on internal triggers + `current_user NOT IN ('authenticated', 'anon')` guard — internal triggers run as `postgres` and pass the guard; client writes fail. ✓
3. Separate `BEFORE UPDATE` trigger with column allow-list — requires maintaining an explicit list; more brittle. ✗

**Decision.** All internal trigger functions (`add_op_as_participant`, `decrement_active_on_full`, `enforce_participation_limits`, `enforce_post_creation_limit`, `maintain_comment_count`, `maintain_spice_averages`) are marked `SECURITY DEFINER SET search_path = public`. Guard functions (`enforce_profile_update_columns`, `enforce_post_update_columns`) bypass with `IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;` at the top.

### Decision 2 — Participation limit ordering: increment before updating participant_count

**Problem.** `enforce_participation_limits` must: (a) insert the new participant into `post_participants`, (b) increment `profiles.active_post_count` for the new commenter, (c) increment `posts.participant_count`. Step (c) fires `decrement_active_on_full` (AFTER UPDATE) when `participant_count` reaches 4. If (c) runs before (b), the 4th commenter is decremented from 0 → −1, violating the `active_post_count >= 0` CHECK constraint.

**Decision.** The order inside `enforce_participation_limits` is strictly: INSERT into `post_participants` → UPDATE `profiles` (increment) → UPDATE `posts` (increment). A comment in the migration documents this dependency.

### Decision 3 — Content filter: word-boundary regex instead of LIKE

**Problem.** `LIKE '%slur%'` causes false positives (e.g. `spic` in `spice`). A word-boundary check is required.

**Options considered.**

1. `LIKE '%word%'` — false positives on substrings. ✗
2. PostgreSQL `\mword\M` regex — true word-boundary anchors, works natively in Postgres. ✓
3. Full-text dictionary approach — overkill at this stage; harder to maintain custom slur list. ✗

**Decision.** Filter uses `v_lower ~ ('\m' || lower(v_word) || '\M')`. The slur/contact-info word lists are in `identifier_words` table (kind = `blocked_slur` / `blocked_contact`), editable without a migration.

### Decision 4 — Seed data: all bulk posts pre-seeded as full (participant_count = 4)

**Problem.** Seeding 50 realistic posts (10 per user) is incompatible with the `active_post_count <= 3` CHECK constraint. The constraint correctly limits live activity; the seed just needs plausible historical data.

**Decision.** All 50 bulk posts are inserted with `participant_count = 4` (is_full = true) and `active_post_count` manually set to 0 after insert. Only Iris's 3 test-fixture posts (deterministic UUIDs `000…f02/f03/f04`) are active. Five triggers that would reject bulk inserts are disabled for the seed and re-enabled at the end.

### Consequences

- The `current_user` guard is now the canonical Akin pattern for distinguishing internal trigger calls from client calls. All new tables that need server-managed columns should follow this pattern.
- The participation limit trigger ordering is fragile: a developer who reorders the three UPDATE/INSERT statements will reintroduce the −1 bug. The comment in 0005 is load-bearing.
- The word-boundary regex requires PostgreSQL's `~` operator; SQLite-based offline tests are not possible for content filtering.
- Seed data must be maintained alongside schema changes — if `posts` or `post_participants` columns change, `seed.sql` needs updating.

---

## ADR-010 — Phase 1 completion: logger, pre-commit hooks, MSW ESM fix

Date: 2026-05-17
Status: Accepted
Decided by: Founder

### Context

Tasks 1.10 and 1.11 complete Phase 1. Three decisions are recorded here.

**Logger design (Task 1.10).** A project-wide structured logger was needed from day one so that no call site ever reaches for `console.*` directly. The logger also needed to scrub PII before any output.

**Pre-commit hooks (Task 1.11).** Commits that would fail CI must be caught locally to keep the feedback loop short.

**MSW 2.x + pnpm hoisted ESM resolution fix.** After pulling Tasks 1.4–1.9, all three test suites failed with "Cannot use import statement outside a module" originating from MSW transitive deps.

### Options considered — logger

1. **Export `scrub` + `logger.*`** — testable independently; Sentry swap-in is mechanical. ✓
2. **Logger only, scrub internal** — harder to unit-test the scrub logic directly.
3. **Use a third-party structured-logging library** — overkill for current needs; adds a dep.

### Options considered — hooks

1. **Husky 9 + lint-staged (staged files only)** — fast (< 5s), catches ESLint + Prettier, typecheck on push. ✓
2. **Run full Jest in pre-commit** — too slow; CI handles it.
3. **lefthook** — not widely known; Husky is the ecosystem standard.

### Options considered — MSW ESM fix

1. **moduleNameMapper to pin MSW to `lib/` CJS output** — already in place but not sufficient alone.
2. **Add ESM-only transitive deps to `transformIgnorePatterns` allowlist** — works for top-level packages (`rettime`, `until-async`).
3. **Pin nested ESM-only package via moduleNameMapper** — required for `@open-draft/deferred-promise@3` (nested in `msw/node_modules/`); pinned to the hoisted v2 CJS build which exports the same API.

### Decision

- **Logger**: exports `scrub()` (named, testable) + `logger.{info,warn,error}`. All three methods call `scrub(context)` before output. `console.*` ESLint rule remains `error` everywhere in `src/`; the three `console.*` calls inside `logger.ts` have justified `eslint-disable-next-line` comments. PII key list: `email`, `password`, `token`, `authorization`, `ip`, `body`, `title`, `notes` (case-insensitive). Sentry integration deferred to Phase 3 — `PHASE 3` comments mark the exact lines.
- **Hooks**: Husky 9 + lint-staged. `pre-commit` → `lint-staged` (ESLint + Prettier on staged files). `pre-push` → `pnpm typecheck`. Config in `package.json`.
- **MSW ESM fix**: added `rettime` and `until-async` to `transformIgnorePatterns` allowlist; pinned `@open-draft/deferred-promise` to hoisted CJS via `moduleNameMapper`.

### Consequences

- Every future log call goes through `logger.*` — PII cannot accidentally leak to Sentry/console.
- Pre-commit catches lint/format regressions before they hit CI.
- MSW test infrastructure is stable; future MSW upgrades may require re-checking the ESM dep chain.
- If `@open-draft/deferred-promise` v2 and v3 diverge in API, the pin may need revisiting.

---

## ADR-009 — Jest + RTL setup and react-native 0.83 Flow workaround (Task 1.5)

Date: 2026-05-01
Status: Accepted
Decided by: Founder

### Context

Task 1.5 sets up Jest, React Native Testing Library, MSW, and the `renderWithProviders` helper. Three non-obvious decisions were made during setup.

### Options considered

**MSW version:**

1. **MSW 2** — modern ESM-first API (`http`, `HttpResponse`). Incompatible with Jest's CommonJS transform: MSW 2 and all its transitive dependencies are ESM-only. Trying to transform them via Babel causes cascading failures.
2. **MSW 1** — CJS-first (`rest`, `ctx`). Works with `jest-expo` and Babel without any extra config. Matches the API shown in the testing skill.

**RTL matchers:**

1. **`@testing-library/jest-native`** — deprecated as of RTL 12.4. Shows a deprecation warning on install.
2. **`@testing-library/react-native` built-ins** — RTL 13 auto-loads `extend-expect` when the main package is imported. No separate package needed.

**react-native 0.83 Flow compatibility:**

- `react-native@0.83.6` introduced `const T:` in Flow generic type parameters in `ViewConfigIgnore.js`. `@babel/parser@7.28` does not support this syntax.
- jest-expo transforms react-native source files via Babel, so the parse fails.
- Workaround: a custom Jest transformer (`src/__mocks__/ViewConfigIgnoreTransformer.js`) is registered for `ViewConfigIgnore\\.js$` files, bypassing Babel and returning a simple stub. Remove when `@babel/parser` adds support.

### Decision

Use MSW 1. Use RTL 13's built-in matchers (no `jest-native`). Apply the custom transformer workaround for `ViewConfigIgnore.js`.

### Consequences

- Upgrade path: when MSW 2 + Jest ESM support matures, migrate `supabase-mock.ts` to the new `http`/`HttpResponse` API and remove the MSW 1 entry from `DECISIONS.md`.
- When `@babel/parser` or `babel-preset-expo` adds support for Flow `const T:` generics, remove `ViewConfigIgnoreTransformer.js` and the `transform` entry from `jest.config.ts`.
- The custom transform is matched by file name, not package version — it's safe to leave in until removed.

---

## ADR-008 — Folder scaffold and path alias strategy (Task 1.4)

Date: 2026-05-01
Status: Accepted
Decided by: Founder

### Context

Task 1.4 establishes the canonical directory structure and path aliases before any feature code lands. The goal is to lock in layout conformance and ensure aliases work in three environments: TypeScript (type-checker), Metro (bundler), and Jest.

### Options considered

1. **`babel-plugin-module-resolver` + `tsconfig.paths` + `moduleNameMapper`** — three configs, each targeting one runtime. Verbose but explicit; each resolver is independently verifiable.
2. **`tsconfig.paths` only** — TypeScript is happy, but Metro and Jest still use node resolution by default, so `@/…` imports would fail at runtime and in tests.
3. **`expo/tsconfig.base` absolute imports** — Expo's base config doesn't support `@/` style by default; would require the same `paths` additions anyway.

### Decision

Use all three in concert:

- `tsconfig.json` `paths` for TypeScript type resolution.
- `babel.config.js` with `babel-plugin-module-resolver` for Metro runtime resolution.
- `jest.config.ts` `moduleNameMapper` for Jest.

Alias set: `@/components`, `@/features`, `@/lib`, `@/i18n`, `@/theme`, `@/types` — mapping to `./src/<name>`.

### Consequences

- All three must stay in sync when a new top-level alias is added.
- `ts-node` is a dev-only dependency required to parse `jest.config.ts` as TypeScript.
- Stub alias-resolution tests (and their `__stub__.ts` files) are deleted once CI is green, per the task brief.

---

## ADR-007 — pnpm `node-linker=hoisted` and minimal babel.config.js

Date: 2026-05-02
Status: Accepted
Decided by: Founder
Supersedes part of ADR-005 (the implicit assumption of pnpm's default isolated linker)

### Context

Bundling Expo Router with the project's default pnpm layout failed at:

```
expo-router/_ctx.ios.js: Invalid call at line 2: process.env.EXPO_ROUTER_APP_ROOT
First argument of `require.context` should be a string denoting the directory to require.
```

`babel-preset-expo` ships an Expo Router transform that inlines `process.env.EXPO_ROUTER_APP_ROOT` into a string at build time. The transform is gated on `hasModule('expo-router')` (which is `require.resolve('expo-router')` from the preset's own location).

With pnpm's default isolated linker, `babel-preset-expo` is a transitive dep of `expo` and is not hoisted to the project's flat `node_modules/`. When Babel resolves `'babel-preset-expo'`, Node walks up the filesystem, fails to find it in the project, and lands on a stray `/Users/ivan/node_modules/babel-preset-expo@13.2.3` (an unrelated artifact in the user's home directory). From that stray location, `require.resolve('expo-router')` fails — so the Expo Router plugin is silently skipped, the `require.context()` call reaches Metro untransformed, and bundling fails.

The project also previously had no `babel.config.js`, so `babel-preset-expo` was not loaded at all. That's a separate, prerequisite fix: every Expo project needs a `babel.config.js` that lists `babel-preset-expo`.

### Options considered

1. **`.npmrc` with `node-linker=hoisted`** — pnpm produces an npm-style flat `node_modules/`. All deps win the walk-up race against any stray parent `node_modules/`. This is what `create-expo-app` generates for pnpm and what Expo docs recommend.
2. **Targeted `public-hoist-pattern[]=babel-preset-expo`** — selectively hoists just the babel preset. Smaller change, but other Expo tooling (Metro plugins, `@expo/cli` internals) is also resolved by name from outside the `.pnpm` store and could fail in the same way as we add features. Whack-a-mole.
3. **Custom resolver in `babel.config.js`** — programmatically locate the preset inside `.pnpm/...`. Fragile (peer-suffix hashes change between installs), and doesn't help any other Expo tool that does name-based resolution.
4. **Add `babel-preset-expo` as a top-level devDependency** — would hoist it, but adds a "phantom" direct dep that the project doesn't actually use directly; deviates from the Expo conventions.

### Decision

Option 1. `.npmrc` contains the single line `node-linker=hoisted`. A minimal `babel.config.js` lists `babel-preset-expo` as the only preset.

### Consequences

- Bundling works on iOS, Android, and web. Verified with `npx expo export --platform ios --dev` and `--platform android --dev`.
- Phantom-dependency prevention from ADR-005 is partially relinquished: any code in this project can `import` from any transitive dependency without declaring it. ESLint can compensate via `import/no-extraneous-dependencies` if we want a soft guard later.
- The `.pnpm/` content-addressable store is still used; install speed and disk savings from pnpm are preserved.
- The stray `/Users/ivan/node_modules/` is unrelated to this project but will silently break any pnpm project run from a subdirectory of `~`. Worth investigating separately, but out of scope here — `node-linker=hoisted` makes us immune to it because the project's own `node_modules/` always wins resolution now.
- If we ever go to a monorepo or want strict-mode pnpm back, revisit this ADR with whatever Expo's published guidance is at that point.

---

## ADR-006 — Metro resolver workaround for react-native-screens 4.23.0 codegen bug

Date: 2026-05-02
Status: Superseded by ADR-007 — see "Postscript" below
Decided by: Founder

### Context

The Metro bundle was failing with:

```
react-native-screens/src/fabric/ScreenStackHeaderSubviewNativeComponent.ts:
Unknown prop type for "type": "undefined"
```

This was originally diagnosed as a bug in `@react-native/codegen@0.83.6`'s TypeScript parser, choking on `CT.WithDefault<Union, 'literal'>` patterns in `react-native-screens@4.23.0`'s Fabric specs.

### Decision (now reverted)

Added a `resolveRequest` shim in `metro.config.js` that redirected any `react-native-screens/src/fabric/**/*.ts` resolution to the pre-built `lib/commonjs/fabric/**/*.js` sibling, on the theory that the compiled CJS form would skip `babel-plugin-codegen` entirely.

### Postscript — why this was wrong

The diagnosis was incorrect. The current `@react-native/codegen@0.83.6` parser handles `CT.WithDefault<Union, 'literal'>` correctly (verified by parsing every `src/fabric/**/*.ts` in the package directly — all 23 files succeed). The actual root cause was the stray `~/node_modules/babel-preset-expo@13.2.3`, which Babel was resolving to instead of the project's `babel-preset-expo@55.0.18`. That ancient preset shipped an old codegen parser that genuinely failed on this pattern.

Worse, the workaround actively broke runtime: `lib/commonjs/fabric/*.js` files don't carry an inlined view config, so when the JS proxy reaches `codegenNativeComponent('RNSSafeAreaView', { interfaceOnly: true })` at runtime it falls back to `requireNativeComponent`. Per the inline comment in `react-native/Libraries/Utilities/codegenNativeComponent.js`, that fallback is **not available in Bridgeless mode** (which SDK 55 + New Arch uses by default). The visible failure was a "View config not found for component `RNSSafeAreaView`" red box on first render via `<Stack />` from expo-router.

### Resolution

`metro.config.js` removed. ADR-007 (`.npmrc` with `node-linker=hoisted`) is the actual fix — once the right `babel-preset-expo` resolves, the codegen plugin inlines view configs correctly and there's nothing left to work around. Bundles still work on iOS / Android / web, and runtime now works because view configs are present at first render.

Lesson kept here for history: when an Expo / Metro / codegen error looks like a third-party-library bug, first verify which copy of `babel-preset-expo` Babel is actually loading. A stray top-level `~/node_modules/` will silently win Node's walk-up resolution under any pnpm project that doesn't use `node-linker=hoisted`.

---

## ADR-006 — Design system: colour palette, typography, and visual identity

Date: 2026-04-30
Status: Accepted
Decided by: Founder (via design handoff — akin-handoff.zip)

### Context

Phase 3 Task 3.2 required colour and typography tokens. The UI skill originally contained placeholder values (aubergine brand primary, GT Sectra display font) pending a design decision. The founder delivered a Claude.ai Design handoff in April 2026 that specifies the final visual language.

### Options considered

1. **Placeholder tokens from UI skill v1** — `brand.primary: #5B2A4D` (aubergine), `brand.accent: #C2664A` (terracotta), `displayFamily: 'GT Sectra'` (paid licence). Used in skill file before handoff.
2. **Tokens from design handoff** — `brand.primary: #2C4D55` (Dark Slate Grey / teal), no terracotta accent, `displayFamily: 'Source Serif 4'` (open-source). Confirmed via screens-ds.jsx and tokens.jsx in the handoff.

### Decision

Use the design-handoff tokens. The brand primary is **teal (#2C4D55)** — not aubergine. No terracotta accent colour; rust (#B54C26) exists only for the spice-flame system. Display font is **Source Serif 4** (Google Fonts, free). Body font is **Inter**. Mono font is **JetBrains Mono**, used exclusively for anonymous identifiers and character counters.

### Consequences

- GT Sectra is not needed. No font licence cost at v1.
- The aubergine/terracotta palette from the old UI skill placeholder is retired. Any agent session that recalls "aubergine primary" should disregard it.
- The colour token structure in `src/theme/colors.ts` follows the handoff exactly (see `.claude/skills/ui/SKILL.md` §2).
- Rust colour must never appear outside the spice-vote UI. Blue (#788BFF) must never appear outside the "you" identifier chip. Teal is the only interactive accent.

---

## ADR-005 — Foundation project setup choices

Date: 2026-04-28
Status: Accepted
Decided by: Founder

### Context

Phase 1 Task 1.1 establishes the project scaffold. Several tooling choices were made that future sessions should know about.

### Options considered

1. **pnpm vs npm/yarn** — pnpm chosen for strict phantom-dependency prevention, faster installs via hard links, and first-class Expo support. Locked at 8.15.9 (the version on the development machine).
2. **Expo Router at scaffold time vs Phase 3** — wired at Task 1.1 on the founder's request, rather than deferring to Phase 3. This is fine; the Phase 3 work will build on top of this entry point rather than add it from scratch.
3. **Bundle identifier** — `com.ourakin.app` rather than `com.akin.app`, because App Store and Play Store require globally unique bundle identifiers and the `akin` namespace was likely taken.
4. **SDK 55 + RN 0.83** — `create-expo-app` defaulted to SDK 54 / RN 0.81, which did not meet the CLAUDE.md requirement. Upgraded to SDK 55.0.18 / RN 0.83.6 using `expo install --fix`.

### Decision

Use pnpm 8.15.9, Expo SDK 55.0.18, React Native 0.83.6, Expo Router (installed at scaffold time), bundle ID `com.ourakin.app`.

### Consequences

- pnpm-lock.yaml is the source of truth for dependencies. Never delete it.
- All future `expo install` calls must use pnpm (e.g. `pnpm exec expo install <pkg>`), not npm.
- Expo Router is live from commit 1; Phase 3 adds the full navigation structure rather than introducing the dependency.

---

## ADR-004 — Skipping TDD for project initialisation (Task 1.1)

Date: 2026-04-28
Status: Accepted
Decided by: Founder (per Phase 1 task brief)

### Context

CLAUDE.md §2 rule 3 mandates TDD — failing test first, always. The Phase 1 task brief explicitly exempts Task 1.1 (project initialisation) from this rule. This ADR documents the exemption so future sessions understand it is intentional, not an oversight.

### Options considered

1. **Skip TDD for 1.1 only** — the task is project scaffolding; there is no behaviour to test before the scaffold exists.
2. **Force TDD anyway** — write a shell test that asserts the project directory exists after `create-expo-app`. Provides zero value and adds friction.

### Decision

TDD skipped for Task 1.1 only. Exemption is a one-off. From Task 1.2 onward, TDD is mandatory without exception.

### Consequences

- This exemption does not set a precedent. Any future "it's just scaffolding" reasoning to skip TDD must be challenged.
- The self-review checklist for 1.1 substitutes for the TDD step: `pnpm typecheck` passing and both simulators launching serves as the functional proof.

---

## ADR-003 — TDD as a hard rule, not a guideline

Date: 2026-04-25
Status: Accepted
Decided by: Founder

### Context

Akin is being built by a solo founder using AI coding agents. There is no peer reviewer for code. The risk of subtle bugs slipping in — especially in RLS policies and the participation-limit triggers — is the single biggest threat to the product's correctness. The agent is good at producing tests; if asked to.

### Options considered

1. **Optional tests** — write tests for the hard stuff, skip the easy parts.
2. **TDD always** — failing test before any implementation, no exceptions.
3. **Tests after implementation** — write the code, then write tests to lock it in.

### Decision

TDD always. The agent writes the failing test first, the founder reviews the test, then the agent implements. This is enforced by the task brief template (every task includes a "Tests to write first" section) and by the self-review checklist.

### Consequences

- Slower per-task. Each task takes ~30% longer than "write code, ship it."
- Tests become the requirements specification. The acceptance criteria gets baked in.
- Refactoring becomes safe. The whole point of having tests is being able to change the code without fear.
- The test suite becomes the trust contract between the founder and the agent. If tests pass, ship. If they don't, the agent didn't do its job.

---

## ADR-002 — Supabase as the only backend

Date: 2026-04-25
Status: Accepted
Decided by: Founder

### Context

Akin's data is highly relational with hard invariants (max 4 participants, max 3 active posts, single spice vote per user per post, identifier uniqueness). The choice of backend determines how those invariants are enforced. Options were Firebase, Supabase, or a custom Node + Postgres backend.

### Options considered

1. **Firebase / Firestore** — fast to start. Document model fits poorly with the relational invariants. "Max 4 participants" requires Cloud Functions and is racy. Vendor lock-in.
2. **Supabase** — Postgres under the hood. Constraints, triggers, and RLS handle the invariants natively. EU hosting. Realtime built in. No lock-in (it's just Postgres).
3. **Custom Node + Postgres** — total control. Adds weeks of infrastructure work. No payback for v1 scope.

### Decision

Supabase, EU region. Postgres for primary data. RLS for authorisation. Triggers for invariants. Edge Functions for custom logic (identifier generation, abuse detection).

### Consequences

- All authorisation lives in the database. The client cannot be trusted, and we don't have to.
- Triggers and RLS policies are now product-critical code. They get pgTAP tests and human expert review.
- If Supabase ever becomes a problem (pricing, region, outages), the migration path is "stand up our own Postgres," which is mechanical, not a re-architecture.

---

## ADR-001 — AI-agent-first development

Date: 2026-04-25
Status: Accepted
Decided by: Founder

### Context

Akin is a self-funded solo project. A traditional contracted build would consume 300–600k SEK before launch — beyond the available capital and beyond the founder's time tolerance. AI coding agents (Claude Code, Cursor) have matured to the point where a single founder can ship production-quality features at 5–10x the velocity of manual coding.

### Options considered

1. **Solo founder writing all code by hand** — predictable quality, slow, expensive on opportunity cost.
2. **Hire a contractor or junior dev** — fast to start, slow to align on taste, expensive (~60–100k SEK/month).
3. **AI-agent-first, founder as architect/reviewer** — fast, cheap (~$100–200/month), demands strong review discipline from the founder.

### Decision

AI-agent-first. Claude Code Max as primary, Cursor Pro as secondary. Founder is the architect and reviewer; agents implement. Critical paths (auth, RLS, payments) get paid human expert review on top.

### Consequences

- Per-feature cost falls from days to hours.
- Code quality depends on the founder's review discipline. The self-review checklist is now load-bearing.
- The risk of subtle AI-introduced bugs is real. Mitigated by: TDD (ADR-003), self-review checklist, paid expert review on critical paths, and `CLAUDE.md` rules that constrain the agent.
- Architecture documentation becomes the agent's memory between sessions. `ARCHITECTURE.md` and these ADRs are part of the build, not an afterthought.

---

## (template — copy this for new entries)

## ADR-NNN — Short title

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by ADR-XXX
Decided by: …

### Context

### Options considered

### Decision

### Consequences
