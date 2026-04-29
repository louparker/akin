# Akin — Architecture

> Read this file at the start of every session. Update it when you change the system shape. If your task only touches a leaf component, you can skim. If it touches data, auth, or any cross-feature path, read it carefully.

---

## 1. The shape, in one diagram

```
+-------------------+         +----------------------+
|   Expo Mobile App | <-----> |      Supabase        |
|  (iOS + Android)  |  HTTPS  |  Postgres + Auth +   |
|                   |         |  Realtime + EdgeFns  |
+-------------------+         +----------+-----------+
                                         |
                              +----------v-----------+
                              |   Sub-processors:    |
                              |   - Sentry (errors)  |
                              |   - PostHog (events) |
                              |   - Resend (email)   |
                              +----------------------+
```

There is no application server. The mobile app talks directly to Supabase. Custom server logic lives in Supabase Edge Functions. This keeps the moving parts to a minimum, which matters for a solo founder.

**Implication.** All authorisation happens at the database boundary via RLS. The app cannot be trusted. The Edge Function cannot be trusted. The database is the only place authorisation is real.

---

## 2. Data model

### Tables (v1.0 + v1.2)

```
auth.users                    (managed by Supabase Auth)
├── id                        uuid, PK
├── email                     text, private
└── ...

profiles                      (1:1 with auth.users)
├── user_id                   uuid, PK, references auth.users(id)
├── anonymous_identifier      text, unique, public
├── language                  text, 'sv' or 'en'
├── age_verified_at           timestamptz, not null
├── active_post_count         int, default 0, check 0..3
├── strike_count              int, default 0
├── status                    enum: active | suspended | banned
├── suspended_until           timestamptz, nullable
├── created_at                timestamptz
└── updated_at                timestamptz

posts
├── id                        uuid, PK
├── author_id                 uuid, references auth.users(id)
├── author_identifier         text, denormalised from profiles
├── title                     text, not null, length 1..150
├── body                      text, not null, length 1..2000
├── category                  enum, see below
├── language                  text, 'sv' or 'en'
├── comment_count             int, default 0  (denormalised)
├── participant_count         int, default 1  (OP counts as 1)
├── is_full                   bool, generated: participant_count >= 4
├── total_spice_score         int, default 0
├── spice_vote_count          int, default 0
├── average_spice_level       numeric generated: total / votes
├── view_count                int, default 0
├── status                    enum: active | hidden | deleted
├── created_at                timestamptz
└── updated_at                timestamptz

post_participants             (join table — who is "in" a post)
├── post_id                   uuid, references posts(id) on delete cascade
├── user_id                   uuid, references auth.users(id) on delete cascade
├── joined_at                 timestamptz
├── PRIMARY KEY (post_id, user_id)

comments
├── id                        uuid, PK
├── post_id                   uuid, references posts(id) on delete cascade
├── author_id                 uuid, references auth.users(id)
├── author_identifier         text, denormalised
├── body                      text, not null, length 1..1000
├── status                    enum: active | hidden | deleted
├── created_at                timestamptz

spice_votes
├── post_id                   uuid, references posts(id)
├── user_id                   uuid, references auth.users(id)
├── score                     int, check 1..5
├── created_at                timestamptz
├── PRIMARY KEY (post_id, user_id)

reports
├── id                        uuid, PK
├── reporter_id               uuid, references auth.users(id)
├── target_type               enum: post | comment | user
├── target_id                 uuid
├── reason                    enum: harassment | hate | spam | sexual | threat | off_topic | other
├── notes                     text, nullable
├── status                    enum: open | reviewed | actioned | dismissed
├── reviewed_by               uuid, nullable
├── reviewed_at               timestamptz, nullable
├── created_at                timestamptz

blocks
├── blocker_id                uuid, references auth.users(id)
├── blocked_id                uuid, references auth.users(id)
├── created_at                timestamptz
├── PRIMARY KEY (blocker_id, blocked_id)
├── CHECK (blocker_id != blocked_id)

feature_flags
├── key                       text, PK  (e.g. 'signups_open')
├── value                     bool
├── description               text
├── updated_at                timestamptz

identifier_words              (curated word lists for identifier generation)
├── id                        bigserial, PK
├── word                      text, unique
├── kind                      enum: adjective | noun
├── language                  text, 'sv' or 'en'
└── approved                  bool

audit_log                     (append-only)
├── id                        bigserial, PK
├── actor_id                  uuid, nullable
├── action                    text  (e.g. 'comment.created', 'report.actioned')
├── target_type               text
├── target_id                 uuid
├── metadata                  jsonb
├── created_at                timestamptz
```

### Categories (fixed enum)

```
'vent_space', 'all_the_feels', 'advice_needed', 'just_wondering',
'story_time', 'decode_this', 'aitoo', 'hypothetically', 'good_vibes'
```

Display labels live in `src/i18n/{sv,en}.ts` keyed by the enum value.

### Indexes

- `posts(category, created_at DESC)` — feed by category, recent first.
- `posts(created_at DESC) WHERE status = 'active'` — main feed.
- `posts(comment_count DESC) WHERE status = 'active'` — sort by comments.
- `posts(average_spice_level DESC NULLS LAST) WHERE status = 'active'` — sort by spice.
- `comments(post_id, created_at ASC)` — comments per post.
- `post_participants(user_id) WHERE …` — used by the active-count trigger.
- `reports(status, created_at)` — moderator queue.

---

## 3. Authentication and identity

- **Auth provider:** Supabase Auth, email + password.
- **Session:** JWT, stored in `expo-secure-store`.
- **Email verification:** required before any post or comment.
- **Age gate:** captured at signup, stored as `age_verified_at` on the profile. No `age_verified_at` → no posting.
- **Identifier generation:** Edge Function `generate-identifier` runs on signup via a database trigger on `auth.users` insert. Uses curated bilingual word lists. Retries on collision.

**Identity hierarchy:**

- `auth.users.id` — internal, never exposed in any read.
- `profiles.user_id` — the foreign key everywhere else uses.
- `profiles.anonymous_identifier` — what other users see.
- `profiles.email` — does not exist; emails live only in `auth.users`.

When you need to show "the author of this post," show `posts.author_identifier`. When you need to check ownership, compare `auth.uid() = posts.author_id` inside an RLS policy.

---

## 4. The participation-limit enforcement

This is the most important piece of the system. It cannot be wrong.

### Per-post invariant

A post has 1 OP + up to 3 unique additional commenters. Enforced by:

1. `post_participants` table with `PRIMARY KEY (post_id, user_id)` — no double-add.
2. A trigger `enforce_post_participant_limit` on `comments` insert:
   - Locks `posts` row with `SELECT ... FOR UPDATE`.
   - If the commenter is already in `post_participants` for this post → allow, no count change.
   - Otherwise: if `posts.participant_count >= 4` → raise `INSUFFICIENT_PARTICIPANT_SLOTS`.
   - Otherwise: insert into `post_participants`, increment `posts.participant_count`. If new count = 4, set `is_full = true` (or rely on the generated column).

### Per-user invariant

A user is active in at most 3 not-yet-full posts. Enforced by:

1. A trigger `enforce_user_active_limit` on `comments` insert (same trigger as above, single transaction):
   - When the user is being added as a new participant: if `profiles.active_post_count >= 3` → raise `USER_ACTIVE_LIMIT_REACHED`.
   - Otherwise: increment `profiles.active_post_count`.
2. A trigger `decrement_user_active_on_full` on `posts` update of `participant_count`:
   - When a post transitions to `participant_count = 4`, decrement `profiles.active_post_count` for every user in `post_participants` for that post.
3. A trigger `decrement_user_active_on_delete` on `comments` delete:
   - If the deleting user is the only commenter from themselves on this post (i.e. removing them entirely from `post_participants`), decrement.

**Isolation level.** All comment inserts run under serializable isolation to prevent the classic "two users race past slot 3" bug. The client retries on serialization failures with exponential backoff.

**Tested exhaustively.** Every edge case has a pgTAP test in `supabase/tests/`. Specifically:

- OP commenting on own post — does not count toward participant cap (OP is already a participant).
- The 4th unique commenter — rejected with `INSUFFICIENT_PARTICIPANT_SLOTS`.
- A user already at 3 active posts trying to comment on a 4th non-full post — rejected with `USER_ACTIVE_LIMIT_REACHED`.
- A user's 3rd post transitioning to full — their active count goes from 3 to 2, allowing the next comment.
- Concurrent comment inserts on a post at slot 3 — exactly one wins, the others get a serialization failure or `INSUFFICIENT_PARTICIPANT_SLOTS`.

---

## 5. RLS policy strategy

**Default deny on every table.** Policies grant access; nothing else does.

| Table             | Read                                                                | Insert                                                                | Update                                                | Delete                             |
| ----------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| profiles          | `status = 'active'` for anon-id only via view; self-row for full    | self only on signup                                                   | self only, restricted columns                         | never                              |
| posts             | `status = 'active'` AND (no block exists between viewer and author) | `auth.uid() = author_id` AND email_verified AND age_verified          | self only, body/title only, within 15 min of creation | self only (soft-delete via status) |
| comments          | same as posts (status + block check)                                | `auth.uid() = author_id` AND email_verified AND limits-trigger-passes | self only, body only, within 15 min                   | self only (soft)                   |
| spice_votes       | self-row only                                                       | self only, post must be active                                        | self only, score change allowed                       | self only                          |
| reports           | reporter sees own only; moderators see all                          | self only                                                             | moderators only                                       | never                              |
| blocks            | self only                                                           | self only                                                             | never                                                 | self only                          |
| post_participants | viewer must be a participant of the post                            | inserted only by the limit trigger                                    | never                                                 | never                              |
| feature_flags     | public read                                                         | service-role only                                                     | service-role only                                     | service-role only                  |
| identifier_words  | public read                                                         | service-role only                                                     | service-role only                                     | service-role only                  |
| audit_log         | moderators only                                                     | service-role only (via SECURITY DEFINER functions)                    | never                                                 | never                              |

**Block enforcement** is done in policy `USING` clauses with a NOT EXISTS subquery. Yes, this has a performance cost — that's what indexes are for. Do not "optimise" by moving block filtering to the client.

**Moderator role.** A custom role `moderator` is granted to specific user IDs via a `user_roles` table. The `is_moderator()` function is a SECURITY DEFINER stable function used in policy clauses.

---

## 6. Realtime

- Comments subscribe to a `post:{postId}` channel for the post being viewed.
- The feed does NOT subscribe to anything realtime — it pulls fresh data on focus and when the user pulls to refresh. Realtime fan-out on the feed is too expensive for the value.
- Realtime events fire after the trigger has succeeded, so by the time the client receives them the invariants hold.

---

## 7. Client architecture

```
app/                  Routes only. No business logic.
src/features/<f>/     Owns its data fetching, state, components, schemas.
src/lib/              Cross-feature infrastructure (Supabase client, Sentry, logger, i18n).
src/components/       Shared, dumb, reusable across features.
src/theme/            Design tokens. The only place colors and spacing values live.
```

**State rules:**

- Server state (anything from Supabase): TanStack Query. Cache key follows `['feature', 'resource', ...params]`.
- Client state that survives navigation: Zustand. One slice per feature.
- Client state that lives in one component: `useState`.
- Forms: React Hook Form, with Zod resolver.

**Mutation pattern:** every TanStack Query mutation invalidates the relevant query keys. Optimistic updates only where the server-side outcome is highly predictable (spice voting yes; commenting no — it might fail the trigger).

---

## 8. Error handling

- **Server errors with codes** (e.g. `INSUFFICIENT_PARTICIPANT_SLOTS`): caught by the API layer, mapped to typed errors in `src/features/<f>/api/errors.ts`, surfaced as i18n strings.
- **Network errors:** TanStack Query retries 2x with backoff, then surfaces a typed `NetworkError`.
- **Validation errors:** Zod failures are mapped to field errors via React Hook Form.
- **Unexpected errors:** caught by a top-level error boundary that logs to Sentry, shows a friendly screen with a "send feedback" button, and offers a retry.

Sentry is configured to scrub email, IP, and message bodies before sending. See `src/lib/sentry.ts`.

---

## 9. Performance budget

- Cold start: < 2.5s on a mid-tier Android device (Pixel 5 baseline).
- Feed scroll: 60fps, no dropped frames at 100 items.
- API p95: < 500ms for feed, < 300ms for post detail.
- App size: < 35MB initial download (iOS), < 25MB Android (AAB).
- Crash-free sessions: > 99.5%.

These are budgets, not guidelines. Regressions are bugs.

---

## 10. Things deliberately not in v1

These are documented so you don't add them by accident:

- Direct messaging.
- Profile viewing of other users.
- Push notifications (transactional only in v1.1).
- Full-text search.
- Editing posts older than 15 minutes.
- Image uploads.
- Reactions other than spice voting.
- Badges, points, streaks, karma.
- Identifier changes after signup.
- Web client.

If a task asks for one of these, escalate to the founder before implementing.

---

## 11. Update protocol

When you change the shape of the system, update this file in the same commit. Specifically:

- Adding a new table → update §2.
- Adding a new RLS policy or changing an existing one → update §5.
- Changing the limit-enforcement trigger → update §4.
- Adding a new top-level dependency → update `CLAUDE.md` §3.
- Making a non-obvious decision → add an entry to `DECISIONS.md`.

If you don't update the docs, the next agent session will not know about your change, and inconsistency will compound. The docs are the project's memory.
