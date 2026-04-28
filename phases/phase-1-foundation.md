# Phase 1 — Foundation

> **Goal:** stand up a clean repo with all the tooling, CI, and conventions in place. Nothing in this phase produces user-visible behaviour — but everything that comes after depends on it being right.
>
> **Estimated duration:** 3–5 days.
>
> **Prerequisites:** none (this is the first phase).
>
> **Skills referenced:** `database`, `testing`, `security`.

---

## Phase deliverables — sign-off checklist

- [ ] Empty Expo + Supabase repo on GitHub, building cleanly on iOS and Android simulators.
- [ ] `CLAUDE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, and all `.claude/skills/*/SKILL.md` files committed.
- [ ] TypeScript strict mode, ESLint with security rules, Prettier all configured and passing on `pnpm typecheck && pnpm lint && pnpm format:check`.
- [ ] Jest + RTL set up with the `renderWithProviders` helper; sample test green.
- [ ] Maestro installed and a "hello world" flow green.
- [ ] EAS Build configured with three profiles: development, preview, production.
- [ ] GitHub Actions CI green on a sample PR.
- [ ] `.env.example` documented; secrets template in repo; `.env.local` gitignored.
- [ ] First ADR-005 entry written documenting the project setup choices.

---

## Task 1.1 — Initialise the Expo project

**Context:** read `CLAUDE.md` §3 (tech stack) and `CLAUDE.md` §4 (repo layout) before starting.

**Goal:** create a new Expo project from scratch with TypeScript and the correct SDK version.

**Acceptance criteria:**

- Repo created at `akin/` with `package.json` showing Expo SDK 55+ and React Native 0.83+.
- New Architecture is enabled (`expo.newArchEnabled: true` in `app.json`).
- Hermes V1 is enabled.
- TypeScript strict mode in `tsconfig.json` (`strict: true`, `noUncheckedIndexedAccess: true`).
- iOS simulator builds and launches the default Expo screen.
- Android emulator builds and launches the default Expo screen.

**Tests to write first:** none (this is project init). Skip the TDD step for this single task and document in `DECISIONS.md` why.

**Implementation notes:**

- Use `npx create-expo-app@latest akin --template blank-typescript`.
- Remove the default starter content (`App.tsx` boilerplate). Leave the project bare for the next tasks to fill in.
- Pin the Expo SDK version explicitly. No `^` on the major.
- Add `pnpm` as the package manager (`packageManager: "pnpm@8.x"` in `package.json`); commit `pnpm-lock.yaml`.

**Self-review:**

- [ ] `pnpm typecheck` passes.
- [ ] iOS and Android sim builds succeed.
- [ ] `package.json` versions match `CLAUDE.md` §3 table.

**Done when:** PR merged with a green CI build on macOS and Linux runners.

---

## Task 1.2 — Set up the documentation skeleton

**Context:** read `CLAUDE.md` §1 and `ARCHITECTURE.md` end-to-end.

**Goal:** commit the four canonical doc files and the skills folder structure.

**Acceptance criteria:**

- `CLAUDE.md` at repo root, exact contents from the agent rules document the founder provides.
- `ARCHITECTURE.md` at repo root.
- `DECISIONS.md` at repo root.
- `.claude/skills/database/SKILL.md`, `.claude/skills/ui/SKILL.md`, `.claude/skills/testing/SKILL.md`, `.claude/skills/i18n/SKILL.md`, `.claude/skills/security/SKILL.md`, `.claude/skills/moderation/SKILL.md` all in place.
- `README.md` with a short project description and pointers to the canonical docs.

**Tests to write first:** none.

**Implementation notes:**

- Copy the files exactly as the founder provides. Don't edit them.
- The `README.md` should be brief — under 100 lines. The detail lives in the canonical docs.

**Self-review:**

- [ ] All seven files present and tracked in git.
- [ ] No accidental edits to the canonical text.

**Done when:** PR merged.

---

## Task 1.3 — TypeScript, ESLint, Prettier

**Context:** read `.claude/skills/security/SKILL.md` §8 (common AI bugs) — many of those are catchable by lint rules.

**Goal:** strict TypeScript and a lint config that rejects the common AI mistakes before they get to PR.

**Acceptance criteria:**

- `tsconfig.json` has: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`, `forceConsistentCasingInFileNames: true`.
- ESLint configured with: `@typescript-eslint/recommended-type-checked`, `react-native/all`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-security`.
- Custom rules enforced: `no-console` (error in production code, off in tests), `no-restricted-imports` for `react-native/Libraries/*`, `@typescript-eslint/no-explicit-any` (error), `@typescript-eslint/no-unsafe-*` (error).
- Prettier configured with project-wide style.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` all pass on the empty project.

**Tests to write first:** write a `__sandbox__/lint-canary.ts` file that intentionally violates each major rule, and a script that confirms ESLint flags exactly those violations. Then delete the canary after CI passes once. (This proves the rules are wired correctly.)

**Implementation notes:**

- Use `eslint-config-expo` as the base, then layer the additional plugins.
- The `no-restricted-imports` rule should specifically forbid `react-native/Libraries/Components` (private API).
- Add `@typescript-eslint/no-floating-promises` (error) — this catches a class of async bugs the agent is prone to.

**Self-review:**

- [ ] All three commands pass on a freshly cloned repo.
- [ ] Canary test confirms each rule fires.
- [ ] Lint config documented at the top of `.eslintrc.cjs` with one-line explanations of the non-default rules.

**Done when:** PR merged, CI green.

---

## Task 1.4 — Folder structure scaffold

**Context:** `CLAUDE.md` §4 has the canonical layout.

**Goal:** create the empty folder structure with `.gitkeep` files so the layout is committed before any code lands.

**Acceptance criteria:**

- `app/(auth)/`, `app/(main)/`, `app/_layout.tsx` exist.
- `src/components/primitives/`, `src/components/composed/`, `src/features/`, `src/lib/`, `src/i18n/`, `src/theme/`, `src/types/` all exist.
- `supabase/migrations/`, `supabase/functions/`, `supabase/tests/` exist.
- `e2e/` exists.
- A `.gitkeep` in each empty folder.
- Path aliases configured in `tsconfig.json` and `babel.config.js`: `@/components`, `@/features`, `@/lib`, `@/i18n`, `@/theme`, `@/types`.

**Tests to write first:** a Jest test that imports a stub from each alias and confirms it resolves. Stub files are deleted after CI passes once.

**Implementation notes:**

- Use `babel-plugin-module-resolver` for runtime alias resolution.
- Make sure Jest's `moduleNameMapper` knows about the aliases too.

**Self-review:**

- [ ] Layout matches `CLAUDE.md` §4 exactly.
- [ ] Aliases resolve in TypeScript, in the bundler, and in Jest.

**Done when:** PR merged, CI green.

---

## Task 1.5 — Jest + RTL + the renderWithProviders helper

**Context:** `.claude/skills/testing/SKILL.md` §7.

**Goal:** Jest set up with React Native Testing Library, MSW for HTTP mocking, and the `renderWithProviders` helper. One sample test passes.

**Acceptance criteria:**

- `jest.config.ts` with the Expo preset.
- `@testing-library/react-native`, `@testing-library/jest-native`, `msw` installed.
- `src/lib/test-utils/render.tsx` exports `renderWithProviders`.
- `src/lib/test-utils/fixtures.ts` exports the `aPost`, `aComment`, `aProfile` fixtures (stubs for now).
- `src/lib/test-utils/supabase-mock.ts` sets up the MSW server handlers.
- Sample component test in `src/components/primitives/__tests__/Text.test.tsx` (Text component is a stub) passes.

**Tests to write first:** the sample Text component test IS the first test. Watch it fail (because Text doesn't exist yet), then make it pass by stubbing the component.

**Implementation notes:**

- Use `@testing-library/jest-native/extend-expect` in a setup file.
- MSW server is started in `jest.setup.ts` with `beforeAll` / `afterAll` lifecycle.
- Reset MSW handlers between tests with `afterEach(() => server.resetHandlers())`.
- TanStack Query in `renderWithProviders` MUST have `retry: false` and `gcTime: 0`.

**Self-review:**

- [ ] `pnpm test` runs and passes.
- [ ] Test exits cleanly (no open handles).
- [ ] MSW logs an unhandled-request warning if a test makes a real network call (this catches mocking gaps).

**Done when:** PR merged, CI green.

---

## Task 1.6 — Maestro for E2E

**Context:** `.claude/skills/testing/SKILL.md` §9.

**Goal:** Maestro installed and a single "hello world" flow green.

**Acceptance criteria:**

- Maestro CLI installed and documented in `README.md` how to install locally.
- `e2e/smoke.yaml` flow that launches the app, waits for the splash screen, asserts the title is visible.
- `pnpm test:e2e:ios` and `pnpm test:e2e:android` scripts wired up.
- Documented in `e2e/README.md` how to run flows locally.

**Tests to write first:** the smoke flow itself. Run it against the app from task 1.1.

**Implementation notes:**

- Don't add E2E to the per-PR CI yet — too slow. Phase 8 wires it into the release pipeline.
- For local runs, the developer needs an iOS simulator or Android emulator running.

**Self-review:**

- [ ] Flow passes on iOS simulator locally.
- [ ] Flow passes on Android emulator locally.
- [ ] Documentation explains how to set up Maestro for a new contributor.

**Done when:** PR merged, both flows pass locally.

---

## Task 1.7 — EAS Build configuration

**Context:** none specific. This is configuration.

**Goal:** EAS Build configured with three profiles. A development build produces a working binary.

**Acceptance criteria:**

- `eas.json` has three profiles: `development`, `preview`, `production`.
- Each profile has correct distribution settings (development = internal, preview = TestFlight/Internal Testing, production = store).
- App identifiers reserved on App Store Connect and Google Play Console: `com.akin.app` (or whatever final ID).
- A development build succeeds via `eas build --profile development --platform ios`.

**Tests to write first:** none.

**Implementation notes:**

- Apple Developer Program enrolment is a prerequisite. Founder handles this offline.
- Google Play Developer account similarly.
- `eas credentials` to set up signing identities.

**Self-review:**

- [ ] All three profiles documented in `eas.json` with comments explaining each.
- [ ] Signing certs stored on EAS, never in source.
- [ ] First development build downloadable and installable on a test device.

**Done when:** at least one profile produces a working build.

---

## Task 1.8 — GitHub Actions CI

**Context:** `.claude/skills/testing/SKILL.md` §10.

**Goal:** PRs run typecheck + lint + format + Jest. Failures block merge.

**Acceptance criteria:**

- `.github/workflows/ci.yml` runs on `pull_request` and `push` to `main`.
- Jobs: `typecheck`, `lint`, `format`, `test`. Each on Ubuntu 24.04 + Node 22 LTS.
- Cache `pnpm` store between runs.
- Branch protection on `main`: all CI jobs must pass; at least one approving review (the founder is the reviewer; this is for posterity).

**Tests to write first:** open a PR with an intentional type error and confirm CI fails. Then fix it and confirm CI passes.

**Implementation notes:**

- Use `pnpm/action-setup@v4` and `actions/setup-node@v4`.
- Pin actions to specific SHAs, not floating tags. (Supply-chain security.)
- `pnpm install --frozen-lockfile` so the lockfile catches drift.

**Self-review:**

- [ ] All jobs run in parallel where possible.
- [ ] Total CI time under 4 minutes.
- [ ] Branch protection visible in repo settings.

**Done when:** main is protected and CI is green.

---

## Task 1.9 — Environment variables and secrets

**Context:** `.claude/skills/security/SKILL.md` §2.

**Goal:** clear separation of public envs (shipped to client) and secrets (server-only). Templates committed; real secrets only on developer machines and CI.

**Acceptance criteria:**

- `.env.example` at repo root listing every env var with empty values and a one-line comment.
- `.env.local` gitignored.
- `app.config.ts` reads public env vars (Supabase URL, anon key, Sentry DSN, PostHog key) via `expo-constants` and `process.env`.
- A check in `app.config.ts` that fails the build if a required env is missing.
- GitHub Actions secrets configured for CI (placeholders documented in `README.md`).

**Tests to write first:** unit test that imports the env reader and confirms it throws when a required var is missing.

**Implementation notes:**

- Use `EXPO_PUBLIC_*` prefix for vars that ship to the client.
- The Supabase service-role key NEVER lives in the client env; only as a Supabase function secret.
- Sentry DSN is technically public (it's in every app), but treat it as semi-secret — load from env, not hardcoded.

**Self-review:**

- [ ] `.env.example` lists every required key.
- [ ] No secret values committed (search history with `git secrets --scan` to verify).
- [ ] Build fails clearly if a required env var is missing.

**Done when:** PR merged, CI green, a fresh clone can build by following `.env.example`.

---

## Task 1.10 — Logger with PII scrubbing

**Context:** `.claude/skills/security/SKILL.md` §6.

**Goal:** the project-wide logger is in place from day one. Every other phase uses it.

**Acceptance criteria:**

- `src/lib/logger.ts` exports `logger.info`, `logger.warn`, `logger.error`.
- All three scrub PII keys (`email`, `password`, `token`, `authorization`, `ip`, `body`, `title`, `notes`).
- Sentry integration is a stub for now (Sentry SDK is added in phase 3); the scrub function is the part that matters.
- `console.log` ESLint rule is set to `error` for production code so the agent reaches for the logger.

**Tests to write first:** unit tests that confirm:
1. Each PII key is replaced with `[redacted]`.
2. Non-PII keys pass through unchanged.
3. Nested objects are scrubbed recursively.
4. Arrays of objects are scrubbed.

**Implementation notes:**

- The PII key list is case-insensitive.
- The scrub function returns a new object — don't mutate.
- The logger's signature should match Sentry's so swapping in the SDK in phase 3 is mechanical.

**Self-review:**

- [ ] Tests pass.
- [ ] No PII leak path in the logger interface.
- [ ] ESLint rejects `console.log` in `src/`.

**Done when:** PR merged, CI green.

---

## Task 1.11 — Pre-commit hooks

**Context:** none specific.

**Goal:** Husky pre-commit runs typecheck on staged files (lint-staged) and rejects commits that would fail CI.

**Acceptance criteria:**

- `husky` and `lint-staged` installed.
- Pre-commit hook runs ESLint and Prettier on staged files.
- Pre-push hook runs typecheck on the whole project.
- Documentation in `README.md` for what to do if the hook fires.

**Tests to write first:** none (it's tooling).

**Implementation notes:**

- Don't run the full Jest suite in pre-commit — too slow. CI catches that.
- Make the hook honour `--no-verify` for emergency commits, but discourage it in docs.

**Self-review:**

- [ ] Commits with bad TypeScript are blocked.
- [ ] Commits with bad lint are blocked.
- [ ] Hook is fast (< 5s on small commits).

**Done when:** PR merged, hook fires correctly on test commits.

---

## End of Phase 1

Sign-off ritual:

1. Run the deliverables checklist at the top of this file.
2. Add an entry to `DECISIONS.md` (ADR-005 or wherever the next slot is) summarising the foundation choices: pnpm, Husky + lint-staged, MSW for HTTP mocking, Maestro for E2E.
3. Commit a tag `phase-1-complete` on `main`.
4. Move to `phase-2-database.md`.
