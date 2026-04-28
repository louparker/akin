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
