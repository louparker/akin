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
