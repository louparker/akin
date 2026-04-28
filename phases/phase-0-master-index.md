# Akin Implementation Plan — Master Index

> Read this before starting any phase. Each phase file in this folder is the working brief for that stretch of the build. Tasks are numbered; complete them in order unless flagged as parallelisable.

---

## Build philosophy

- **TDD always.** Every task starts with the failing test.
- **One task at a time.** Don't batch tasks. Don't skip ahead. Each task is small enough to fit in a single agent session.
- **Plan before code.** Write the plan, get it confirmed, then implement.
- **Self-review every PR.** Use the four-lens checklist in `.claude/skills/security/SKILL.md` §5.
- **Update docs in the same commit.** Architecture, decisions, change logs.

## Estimated timeline

| Phase | Name | Estimated calendar days | Why this slot |
| --- | --- | --- | --- |
| 1 | Foundation | 3–5 days | Repo, tooling, environments, CI. Boring but load-bearing. |
| 2 | Database & backend core | 7–10 days | Schema, RLS, the participation-limit triggers, identifier generator. The most important phase. |
| 3 | App shell & design system | 4–6 days | Expo setup, theme, primitives, i18n scaffolding. |
| 4 | Auth & onboarding | 5–7 days | Signup, login, email verification, age gate, identifier reveal. |
| 5 | Feed & posts | 6–9 days | Feed, filters, sort, categories, post detail, post creation. |
| 6 | Comments & limits | 5–7 days | Commenting, the limit UI states, spice voting, realtime. |
| 7 | Trust & safety | 5–7 days | Reporting, blocking, keyword filtering, moderator dashboard. |
| 8 | Polish & launch | 5–8 days | Profile, settings, accessibility audit, performance, App Store submission. |

**Total:** ~6–8 weeks of focused build, assuming the founder is full-time and the agent absorbs most implementation work.

## Phase contracts

Each phase ends with a written sign-off:

- All tasks complete, tests green.
- Phase deliverables list at the end of each phase file checked off.
- `DECISIONS.md` and `ARCHITECTURE.md` reflect any changes.
- The phase has been demoed end-to-end on a real device (TestFlight build for iOS, internal track for Android — start using these from phase 4 onward).

Don't start phase N+1 until phase N is signed off. Discipline here saves months later.

## Phase index

- [`phase-1-foundation.md`](./phase-1-foundation.md) — repo, tooling, CI, environments, secrets management.
- [`phase-2-database.md`](./phase-2-database.md) — Supabase project, schema, RLS policies, triggers, Edge Functions, pgTAP suite.
- [`phase-3-app-shell.md`](./phase-3-app-shell.md) — Expo + Expo Router setup, theme, primitives, i18n, Sentry, PostHog, navigation.
- [`phase-4-auth-onboarding.md`](./phase-4-auth-onboarding.md) — signup, login, email verification, age gate, identifier reveal, onboarding screens.
- [`phase-5-feed-posts.md`](./phase-5-feed-posts.md) — feed, category pages, sort/filter, post detail, post creation.
- [`phase-6-comments-limits.md`](./phase-6-comments-limits.md) — commenting, limit-state UX, spice voting, realtime updates.
- [`phase-7-trust-safety.md`](./phase-7-trust-safety.md) — reporting, blocking, keyword filtering, moderator dashboard, audit log.
- [`phase-8-polish-launch.md`](./phase-8-polish-launch.md) — profile, settings, dark mode, accessibility audit, performance profiling, App Store + Play Store submission.

## How to use a phase file

When starting a phase:

1. Read the phase file end to end.
2. Read any skill files it points to.
3. Skim `DECISIONS.md` for context.
4. Begin task 1.

For each task:

1. Read the task. Note which skill files it references.
2. Read those skill files.
3. Write the plan and present to the founder.
4. After confirmation: write the failing test.
5. Implement. Verify the test passes.
6. Run the four-lens self-review.
7. Open a PR with the diff and the self-review checklist filled in.
8. Move to the next task.

## Parallelism

Most tasks are sequential. A few are explicitly marked `parallel:` and can be worked in any order or simultaneously across multiple sessions. The default is sequential.

## Buffer

Each phase has a 20% schedule buffer baked in. If a task is taking 2x its estimate, stop and ask why. If a phase is going to overrun by more than 20%, raise it with the founder — sometimes scope was wrong, sometimes the approach is wrong.

## Concepts to be aware of (founder's running list)

These are decisions or risks I want the founder to keep in mind across phases. They aren't tasks themselves, but they shape decisions inside tasks.

1. **Feature flags from day one.** Every new user-visible feature ships behind a flag. Already wired in phase 2.
2. **Soft delete, not hard delete.** Posts, comments, accounts use `status = 'deleted'` flags, not real `DELETE`. The data needs to remain for moderation and legal preservation. Real deletion happens via a scheduled job after a retention period.
3. **The 15-minute edit window.** Posts and comments can be edited only within 15 minutes of creation. Not negotiable — edits after the fact would break the discussion thread integrity.
4. **No editing of category after post.** Once posted, a post's category is fixed. Allowing changes lets people farm by reposting in a hotter category.
5. **Identifier never changes.** Even on premium. Changing identifiers undermines accountability of the discussion.
6. **The OP is always a participant.** The trigger logic depends on this. Don't try to "free up" the OP by removing them from `post_participants`.
7. **Realtime is per-post, never feed-wide.** Cost containment.
8. **The kill-switches are load-bearing.** Don't refactor the flag-reading code without thinking through what happens during an incident.
9. **AI translation is a draft, not a release.** All Swedish UI strings get a native review pass before launch (phase 8).
10. **Critical-path comments are not optional.** Every auth, RLS policy, and (later) payment file gets a `// CRITICAL-PATH:` marker so the quarterly expert review can find them.
