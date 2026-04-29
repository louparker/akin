# Phase 2 — Database & backend core

> **Goal:** stand up the Supabase project, write every migration that v1 needs, get every RLS policy and trigger right, and prove correctness with a complete pgTAP suite.
>
> **Estimated duration:** 7–10 days. The most important phase — slow down here.
>
> **Prerequisites:** Phase 1 signed off.
>
> **Skills referenced:** `database` (read end-to-end), `testing` (§6 pgTAP), `security` (especially §3 input validation and §8 common AI bugs), `moderation` (§5 keyword filter, §10 audit log).

---

## Phase deliverables — sign-off checklist

- [ ] Supabase project provisioned in EU region (Frankfurt or Stockholm).
- [ ] All v1.0 + v1.2 tables created with RLS enabled.
- [ ] Every RLS policy in place per `ARCHITECTURE.md` §5.
- [ ] Participation-limit triggers + tests covering every edge case.
- [ ] Identifier generator Edge Function + tests.
- [ ] Keyword content filter + tests.
- [ ] Audit log table + write-only trigger.
- [ ] Feature flags table seeded with the three kill-switches.
- [ ] Generated TypeScript types committed at `src/types/database.ts`.
- [ ] pgTAP suite green in CI against a fresh local Supabase.
- [ ] Local Supabase stack runnable with one command (`pnpm db:up`).

---

## Task 2.1 — Provision the Supabase project

**Context:** read `ARCHITECTURE.md` §1 and `.claude/skills/database/SKILL.md` §3 (service-role boundaries).

**Goal:** Supabase project live in the EU. Local development environment matches production.

**Acceptance criteria:**

- Project created in Supabase Cloud, region: `eu-central-1` or `eu-north-1`.
- Pro plan enabled (we need PITR and the bigger compute tier).
- Local development uses `supabase start` (Docker-based) with the same Postgres extensions as production.
- `supabase/config.toml` committed with the project ref and region.
- Anon key and project URL added to `.env.example`.
- Service-role key set as a Supabase secret (never in source) and as a GitHub Actions secret for CI.

**Tests to write first:** none — this is provisioning.

**Implementation notes:**

- Use the Supabase CLI (`supabase`) to manage migrations from the command line. Don't use the web SQL editor for anything that should be in source control.
- Enable the `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `pgtap` extensions.
- Configure auth: email confirmation required, password length min 8, rate limit 5 attempts / 10 min.
- Disable email change without confirmation. Disable magic link login.

**Self-review:**

- [ ] `supabase start` runs locally without errors.
- [ ] Auth settings match what's documented in `.claude/skills/security/SKILL.md` §4.
- [ ] No service-role key in any committed file.

**Done when:** local stack runs, remote project ready, secrets stored.

---

## Task 2.2 — Migration 0001: profiles table

**Context:** `ARCHITECTURE.md` §2; `.claude/skills/database/SKILL.md` §1, §2.

**Goal:** the `profiles` table that joins to `auth.users`, holds the anonymous identifier, and tracks active post count + status.

**Acceptance criteria:**

- Migration file `supabase/migrations/0001_create_profiles.sql`.
- `profiles` table per `ARCHITECTURE.md` §2.
- `language` defaults to `'sv'`.
- `status` enum has `active`, `suspended`, `banned`.
- `active_post_count` has `CHECK (active_post_count >= 0 AND active_post_count <= 3)`.
- RLS enabled.
- Policies: self can SELECT own row; self can UPDATE language column only.
- Auth-trigger that creates a `profiles` row on `auth.users` insert (we'll fill in the identifier in task 2.5).
- Index on `anonymous_identifier` (unique, enforced by table constraint).

**Tests to write first:**

- `supabase/tests/profiles_basic.test.sql`
- Test 1: inserting into auth.users automatically creates a profiles row.
- Test 2: another user cannot SELECT my profile row.
- Test 3: I can SELECT my own profile row.
- Test 4: I cannot UPDATE my profile's `active_post_count` directly (only the trigger can).
- Test 5: the `active_post_count` constraint rejects values < 0 and > 3.

**Implementation notes:**

- The auth-trigger lives in the `auth` schema and references our `public.profiles` table:
  ```sql
  CREATE FUNCTION public.handle_new_user() RETURNS trigger ...
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users ...
  ```
- For now, the new profile gets a placeholder identifier `pending_NNN` — the real generator runs in task 2.5 and overwrites it.
- The `active_post_count` field is server-managed only. No RLS UPDATE policy that includes it.

**Self-review (database lens):**

- [ ] RLS enabled.
- [ ] All policies tested in pgTAP.
- [ ] Foreign key on `user_id` with `ON DELETE CASCADE` (so a deleted auth user removes the profile).
- [ ] No service-role-only field exposed via the client API.

**Done when:** migration applies cleanly locally and remotely; pgTAP passes.

---

## Task 2.3 — Migration 0002: identifier_words table + seeding

**Context:** `.claude/skills/database/SKILL.md` §1; `ARCHITECTURE.md` §2.

**Goal:** the curated bilingual word lists used to generate anonymous identifiers.

**Acceptance criteria:**

- Migration `0002_create_identifier_words.sql`.
- `identifier_words` table per `ARCHITECTURE.md` §2.
- RLS enabled with public read, service-role write.
- Seed data: ~200 adjectives and ~200 nouns in each language, all marked `approved = true`.
- Words selected to be neutral, friendly, never offensive in either language. (e.g. avoid "Crazy" — fine in English, harsher connotation in Swedish.)
- Index on `(kind, language, approved)` for the lookup hotpath.

**Tests to write first:**

- pgTAP test: anon role can SELECT from `identifier_words`.
- pgTAP test: anon role cannot INSERT or UPDATE.
- Unit test (separate file): list contains no offensive combinations from a known-bad-words checklist.

**Implementation notes:**

- The agent can draft the word lists, but the founder must hand-review them before merge. Mark each list with a `// TODO i18n review:` comment until reviewed.
- Words should be 4–12 characters. Single-syllable and pronounceable in both languages preferred.
- Avoid words tied to gender, body, race, religion, illness.
- Examples (English, illustrative): `Crimson, Kind, Quiet, Honest, Soft, Bright, Calm, Steady` (adjectives); `Fox, Otter, River, Lantern, Garden, Compass` (nouns).
- Examples (Swedish, illustrative): `Vänlig, Lugn, Klok, Mjuk, Stilla, Trygg`; `Räv, Uttern, Älv, Lykta, Trädgård`.

**Self-review:**

- [ ] No word in either list is offensive.
- [ ] Total word counts allow ~10,000+ unique identifier combinations in each language.
- [ ] Word reviews logged (`// reviewed by [name] on YYYY-MM-DD`).

**Done when:** PR merged, founder has reviewed both lists.

---

## Task 2.4 — Migration 0003: posts and comments tables (without limits triggers yet)

**Context:** `ARCHITECTURE.md` §2.

**Goal:** the core content tables. Limits enforcement comes in task 2.7 — for now just the schema, RLS, and basic constraints.

**Acceptance criteria:**

- Migration `0003_create_posts_and_comments.sql`.
- `posts` table with all columns from `ARCHITECTURE.md` §2.
- `category` enum with the 9 fixed values.
- `language` enum (`'sv'`, `'en'`).
- `status` enum (`'active'`, `'hidden'`, `'deleted'`).
- `post_participants` table with PK `(post_id, user_id)`.
- `comments` table with all columns.
- RLS enabled on all three.
- Read policy on `posts`: `status = 'active'`.
- Read policy on `comments`: `status = 'active'`.
- Insert policy on `posts`: `auth.uid() = author_id` AND email confirmed AND age verified.
- Insert policy on `comments`: same author check + email/age.
- Read policy on `post_participants`: only participants of the post can read.
- Indexes per `ARCHITECTURE.md` §2.

**Tests to write first:**

- pgTAP: unverified user cannot insert a post.
- pgTAP: user without `age_verified_at` cannot insert a post.
- pgTAP: post with `status = 'hidden'` is invisible to readers.
- pgTAP: foreign key on comments → posts is enforced.
- pgTAP: deleting a post cascades to comments and post_participants.

**Implementation notes:**

- Block-aware RLS goes in task 2.10 (after the blocks table exists).
- The 15-minute edit policy on UPDATE goes in task 2.6.
- Default `language` to `'sv'` for new posts when not specified.
- `is_full` is a generated column: `GENERATED ALWAYS AS (participant_count >= 4) STORED`.

**Self-review (data lens):**

- [ ] Every FK has a covering index.
- [ ] Generated column works as expected.
- [ ] Cascade deletes thought through (we want them on participants and comments, NOT on posts when an author is banned — handle that via status).

**Done when:** migration applied, pgTAP passes.

---

## Task 2.5 — Edge Function: generate-identifier

**Context:** `.claude/skills/database/SKILL.md` §3 (service-role boundaries); `ARCHITECTURE.md` §3 (identity).

**Goal:** an Edge Function that picks a random adjective + noun + 2–4 digit suffix, retries on collision, updates the user's profile.

**Acceptance criteria:**

- `supabase/functions/generate-identifier/index.ts` (Deno).
- Triggered by the auth-trigger from task 2.2 (which inserts a placeholder, then calls this function asynchronously to fill in the real identifier).
- Picks from `identifier_words` where `approved = true` matching the user's `language`.
- Format: `[Adjective][Noun][NN]` to `[Adjective][Noun][NNNN]`.
- Retries up to 5 times on unique-constraint violation.
- Returns 500 with a clear error if all 5 retries fail.

**Tests to write first:**

- Integration test (Jest, against local Supabase): create a user, await the function, assert a real identifier is set on the profile.
- Integration test: simulate collision by pre-seeding the namespace; assert retries succeed.
- Unit test on the random-pick function: distribution is acceptably uniform.

**Implementation notes:**

- Use the service-role key inside the function (it's server-side, this is fine).
- The function is invoked via `pg_net` from the auth trigger, OR via a Supabase Realtime listener on `profiles` rows with `anonymous_identifier LIKE 'pending_%'`. Choose whichever is more reliable in 2026 — `pg_net` is simpler.
- Log to the `audit_log` table when an identifier is assigned (action `'profile.identifier_assigned'`).
- Suffix length increases on each retry (2 digits → 3 digits → 4 digits) to widen the namespace.

**Self-review:**

- [ ] Service-role key is loaded from `Deno.env`, not hardcoded.
- [ ] No PII in logs.
- [ ] Function timeout under 5s.
- [ ] Idempotent: running twice doesn't create two identifiers.

**Done when:** integration test green, manual smoke (signup → check profile) shows a real identifier within 2s.

---

## Task 2.6 — Migration 0004: 15-minute edit window + restricted column updates

**Context:** `.claude/skills/database/SKILL.md` §2 (RLS patterns).

**Goal:** posts and comments can be updated by their author only within 15 minutes of creation, and only the body/title columns.

**Acceptance criteria:**

- Migration `0004_edit_window.sql`.
- UPDATE policy on `posts`: `auth.uid() = author_id AND created_at > now() - interval '15 minutes'`.
- UPDATE policy on `comments`: same.
- BEFORE UPDATE trigger on `posts` and `comments` that raises if any non-allowed column changed (allowed: `body`, `title`, `status` for self-soft-delete only).

**Tests to write first:**

- pgTAP: I can update my own post within 14 minutes.
- pgTAP: I cannot update my own post after 16 minutes.
- pgTAP: I cannot change `category` of my own post even within the window.
- pgTAP: I cannot change `author_id` of my own post.
- pgTAP: I cannot update someone else's post.
- pgTAP: changing `status` from `active` to `deleted` is allowed (soft delete by self).

**Implementation notes:**

- The trigger uses `OLD` and `NEW` columns to detect changes per column.
- A specific `UPDATE_NOT_ALLOWED` exception code so the client can map to a friendly message.

**Self-review (security lens):**

- [ ] Author check on every update.
- [ ] No way to bypass the time window via client trickery.
- [ ] Soft-delete works.

**Done when:** pgTAP passes.

---

## Task 2.7 — Migration 0005: participation-limit triggers

**Context:** read `.claude/skills/database/SKILL.md` §4 carefully — the entire trigger pattern is there. Read `ARCHITECTURE.md` §4 for the invariants.

**Goal:** the participation-limit triggers, fully tested. This is the most important code in the database.

**Acceptance criteria:**

- Migration `0005_participation_limits.sql`.
- `enforce_participation_limits()` function and BEFORE INSERT trigger on `comments`.
- `decrement_active_on_full()` function and AFTER UPDATE trigger on `posts`.
- `add_op_as_participant()` function and AFTER INSERT trigger on `posts`.
- BEFORE INSERT trigger on `posts` that raises if the author's `active_post_count >= 3`.
- Specific error codes: `INSUFFICIENT_PARTICIPANT_SLOTS` (P0001), `USER_ACTIVE_LIMIT_REACHED` (P0003), `POST_NOT_FOUND` (P0002).
- Serializable isolation enforced for comment inserts (set on the connection by the JS client; documented).

**Tests to write first — pgTAP, every edge case from `ARCHITECTURE.md` §4:**

- 4th unique commenter is rejected.
- OP commenting on own post does not increment participant count.
- OP commenting on own post does not increment active count (already counted at post creation).
- A user already at 3 active posts cannot comment on a 4th non-full post.
- A user's 3rd post transitioning to full → their active count goes from 3 to 2 → they can now join a new conversation.
- Concurrent inserts on a slot-3 post: exactly one wins (test with two transactions).
- A repeat commenter (already a participant) does not change participant or active counts.
- A user creating a 4th post while at active=3 is rejected.
- Soft-deleting a comment does NOT decrement counts (the user is still a participant; just their comment is hidden).
- Deleting a post (cascade) decrements active counts for all participants.

**Implementation notes:**

- Use `SELECT ... FOR UPDATE` on both the post row and the profile row, in that order, every time, to avoid deadlocks.
- The trigger function is short. Do not optimise it. Correctness is the only goal.
- Add a `// CRITICAL-PATH: limits` marker in the migration header.
- Use `RAISE EXCEPTION '...' USING ERRCODE = 'P0001'` so the client can pattern-match on the code.

**Self-review (security + data lens):**

- [ ] Every edge case in the test list is covered.
- [ ] No race condition under concurrent load — proven by the concurrent test.
- [ ] No way to bypass the limits from the client.
- [ ] No silent failures — every reject raises.
- [ ] Marked CRITICAL-PATH for expert review.

**Done when:** pgTAP green, including the concurrency test which uses two parallel transactions.

---

## Task 2.8 — Migration 0006: spice_votes table + trigger

**Context:** `ARCHITECTURE.md` §2.

**Goal:** users can vote 1–5 on a post's spice level, exactly once. Average is denormalised on the post.

**Acceptance criteria:**

- Migration `0006_spice_votes.sql`.
- `spice_votes` table with PK `(post_id, user_id)`, `score CHECK (score BETWEEN 1 AND 5)`.
- Trigger on insert/update/delete that updates `posts.total_spice_score`, `spice_vote_count`, recalculates `average_spice_level`.
- RLS: self can SELECT own; self can INSERT (post must be active, non-self vote check); self can UPDATE own score; self can DELETE own.
- Special rule: cannot vote on own post (RLS WITH CHECK).

**Tests to write first:**

- pgTAP: I can vote 1–5 on someone else's post.
- pgTAP: I cannot vote on my own post.
- pgTAP: I cannot vote twice on the same post (I can update my vote).
- pgTAP: changing my vote updates the post's average correctly.
- pgTAP: deleting my vote removes it from the average.
- pgTAP: vote score outside 1–5 is rejected.

**Implementation notes:**

- The denormalised counts on `posts` make reads fast. Don't compute averages on read.
- `average_spice_level` is `NULL` when `spice_vote_count = 0`.

**Self-review (data lens):**

- [ ] Trigger is idempotent (safe to fire multiple times for the same change).
- [ ] No overflow on `total_spice_score` (use `int8` if you're paranoid, but `int4` is fine — max is 5 \* 4 commenters = 20 per post).

**Done when:** pgTAP green.

---

## Task 2.9 — Migration 0007: blocks table + block-aware RLS

**Context:** `.claude/skills/moderation/SKILL.md` §4; `.claude/skills/database/SKILL.md` §2 (block-aware read pattern).

**Goal:** users can block each other. Blocked users' posts and comments disappear from the blocker's view, bidirectionally.

**Acceptance criteria:**

- Migration `0007_create_blocks.sql`.
- `blocks` table per `ARCHITECTURE.md` §2.
- RLS: self only.
- Updated read policies on `posts` and `comments` to add the `NOT EXISTS` block check from `.claude/skills/database/SKILL.md` §2.
- Index on `blocks(blocked_id)` (the PK already covers `(blocker_id, blocked_id)`).

**Tests to write first:**

- pgTAP: A blocks B → A cannot see B's posts.
- pgTAP: A blocks B → B cannot see A's posts (bidirectional).
- pgTAP: A blocks B → A cannot see B's comments on a thread A started.
- pgTAP: A unblocks B → both can see each other's content again.
- pgTAP: A cannot block themselves (CHECK constraint).

**Implementation notes:**

- The `NOT EXISTS` subquery in RLS adds cost. The PK on `blocks(blocker_id, blocked_id)` is the primary index; add a secondary on `blocks(blocked_id)` for the reverse lookup direction.
- Don't try to "optimise" by materialising a "visible-to" view. Keep RLS authoritative.

**Self-review (security + data + performance lens):**

- [ ] Bidirectional invisibility tested.
- [ ] Index on `blocks(blocked_id)` exists.
- [ ] Query plan on the feed shows index use, not seq scan.

**Done when:** pgTAP green.

---

## Task 2.10 — Migration 0008: reports table

**Context:** `.claude/skills/moderation/SKILL.md` §3.

**Goal:** the report intake flow.

**Acceptance criteria:**

- Migration `0008_create_reports.sql`.
- `reports` table per `ARCHITECTURE.md` §2.
- `reason` enum with the 7 values from `.claude/skills/moderation/SKILL.md` §2.
- `status` enum: `open`, `reviewed`, `actioned`, `dismissed`.
- RLS: reporter sees own reports only; moderators see all (via `is_moderator()`).
- Insert policy: `reporter_id = auth.uid()` and target exists.
- Update policy: only moderators.
- Rate limit trigger: max 5 reports per hour per reporter; raise `REPORT_RATE_LIMIT` if exceeded.
- Self-report check: `reporter_id != target_id` when target_type = 'user'.

**Tests to write first:**

- pgTAP: user files a report on a post → row inserted, status `open`.
- pgTAP: user can SELECT only their own reports.
- pgTAP: 6th report in an hour from same reporter is rejected.
- pgTAP: cannot report yourself.
- pgTAP: moderator sees all reports.

**Implementation notes:**

- The rate limit uses a window query against `reports.created_at`.
- Add `// CRITICAL-PATH: moderation` comment to the rate limit trigger.

**Self-review:**

- [ ] Reporter identity never leaks to other reporters (test it).
- [ ] Moderator-only update tested.

**Done when:** pgTAP green.

---

## Task 2.11 — Migration 0009: user_roles + is_moderator()

**Context:** `.claude/skills/database/SKILL.md` §2 (moderator role pattern).

**Goal:** the moderator role infrastructure.

**Acceptance criteria:**

- Migration `0009_user_roles.sql`.
- `user_roles` table per the skill file pattern.
- `is_moderator()` function — `STABLE`, `SECURITY DEFINER`, `SET search_path = public`.
- RLS: users see only their own role.
- Granted only via service-role (no UPDATE policy for non-service-role).
- Founder's account ID added as a moderator in a separate `seed.sql` for local dev — production grant happens via SQL editor by the founder.

**Tests to write first:**

- pgTAP: `is_moderator()` returns true for users in `user_roles` with role `moderator` or `admin`.
- pgTAP: `is_moderator()` returns false for everyone else.
- pgTAP: a non-service-role user cannot insert into `user_roles`.

**Implementation notes:**

- `SET search_path = public` is mandatory on `SECURITY DEFINER` functions to prevent schema-confusion attacks.
- Mark `// CRITICAL-PATH: auth + moderation`.

**Self-review (security lens):**

- [ ] `SECURITY DEFINER` plus `search_path` set.
- [ ] No way for a regular user to grant themselves a role.

**Done when:** pgTAP green.

---

## Task 2.12 — Migration 0010: audit_log

**Context:** `.claude/skills/moderation/SKILL.md` §9.

**Goal:** the append-only audit log.

**Acceptance criteria:**

- Migration `0010_audit_log.sql`.
- `audit_log` table per `ARCHITECTURE.md` §2.
- RLS: moderators read; nobody updates; nobody deletes.
- A `log_audit()` SECURITY DEFINER function used by other migrations to write entries.
- Index on `(target_type, target_id, created_at DESC)` for the "history of this thing" lookup.
- Index on `(actor_id, created_at DESC)` for the "what did this moderator do" lookup.

**Tests to write first:**

- pgTAP: regular user cannot SELECT.
- pgTAP: moderator can SELECT.
- pgTAP: nobody, including moderators, can DELETE (no policy means default deny).
- pgTAP: `log_audit()` writes a row with the right shape.

**Implementation notes:**

- Audit entries are written from inside other triggers and Edge Functions. They never come directly from the client.

**Done when:** pgTAP green.

---

## Task 2.13 — Migration 0011: feature_flags + kill-switches

**Context:** `.claude/skills/moderation/SKILL.md` §10.

**Goal:** the three kill-switches in the database, with a default-safe fallback in the client.

**Acceptance criteria:**

- Migration `0011_feature_flags.sql`.
- `feature_flags` table per `ARCHITECTURE.md` §2.
- Seed rows: `signups_open = true`, `posting_open = true`, `realtime_open = true`.
- RLS: public SELECT, service-role only WRITE.
- A pg_net or similar mechanism is OUT of scope here; the client polls every 60s in phase 3.

**Tests to write first:**

- pgTAP: anon and authenticated users can SELECT all rows.
- pgTAP: anon and authenticated users cannot UPDATE.

**Done when:** pgTAP green, three rows present.

---

## Task 2.14 — Migration 0012: keyword content filter

**Context:** `.claude/skills/moderation/SKILL.md` §5.

**Goal:** the server-side keyword filter on post and comment creation.

**Acceptance criteria:**

- Migration `0012_content_filter.sql`.
- `filter_words` table: `(word text, kind enum('slur','spam_pattern'), language text, active bool)`.
- `check_content_filter(content text)` function, raises `CONTENT_FILTER_HIT` (P0010) or `CONTACT_INFO_NOT_ALLOWED` (P0011).
- BEFORE INSERT trigger on `posts` and `comments` calling `check_content_filter`.
- Seed data: a starter slur list (bilingual, hand-curated) and the contact-info regexes from `.claude/skills/moderation/SKILL.md` §5.

**Tests to write first:**

- pgTAP: a post containing a slur is rejected with `CONTENT_FILTER_HIT`.
- pgTAP: a post containing a phone number is rejected with `CONTACT_INFO_NOT_ALLOWED`.
- pgTAP: a post containing an email is rejected.
- pgTAP: a post containing "snapchat: thatperson" is rejected.
- pgTAP: a normal post passes.
- pgTAP: case-insensitive matching works.

**Implementation notes:**

- The slur list must be hand-curated by the founder. Same review process as the identifier word lists.
- Mark `// TODO i18n review:` until reviewed.
- Be conservative — the filter errs toward false positives. Users see a clear message and can contact support if it's a false hit.

**Done when:** pgTAP green, slur list reviewed by founder.

---

## Task 2.15 — Generated TypeScript types

**Context:** `.claude/skills/database/SKILL.md` §5.

**Goal:** the generated types match the live schema and are committed.

**Acceptance criteria:**

- `pnpm db:gen-types` script runs `supabase gen types typescript --local > src/types/database.ts`.
- `src/types/database.ts` committed.
- A pre-commit check that warns if the file is stale relative to migrations.

**Tests to write first:** integration test that imports the generated type and references a known table column. If the schema changed without regenerating, this fails.

**Implementation notes:**

- The check could be a CI job that regenerates types and diffs against committed.

**Done when:** types generated, committed, CI catches drift.

---

## Task 2.16 — Local seed data

**Context:** `.claude/skills/testing/SKILL.md` §6.

**Goal:** `supabase/seed.sql` populates a local database with realistic test data so the agent and founder can exercise the app immediately.

**Acceptance criteria:**

- `supabase/seed.sql` creates ~10 test users with profiles, ~50 posts across the 9 categories, ~150 comments, some spice votes, a couple of blocks.
- All using known UUIDs so tests can reference them.
- Seed runs after migrations on `supabase start` / `supabase db reset`.

**Tests to write first:** none (it's seed data).

**Implementation notes:**

- Use a deterministic pattern for UUIDs: `00000000-0000-0000-0000-000000000001` for first user, etc.
- Include one full post (4 participants) and one user already at 3 active posts so the limit-edge-cases are reachable in dev.

**Done when:** `supabase db reset` produces a usable dataset.

---

## End of Phase 2

Sign-off ritual:

1. Run the deliverables checklist.
2. ADR entry summarising the schema decisions and the limits-trigger design.
3. Schedule the first paid expert review of the auth + RLS + triggers (recommended: 4 hours of a senior engineer's time, ~5–8k SEK).
4. Tag `phase-2-complete`.
5. Move to `phase-3-app-shell.md`.
