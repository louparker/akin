---
name: database
description: Read this skill before writing any SQL — migrations, RLS policies, triggers, indexes, or pgTAP tests. Covers the participation-limit enforcement, RLS patterns, identifier generation, and how to test database code.
---

# Database skill

> Activate this skill whenever the task touches `supabase/migrations/`, `supabase/functions/`, `supabase/tests/`, or generated TypeScript types.

---

## 1. Migration discipline

- One migration file per change. Filename: `NNNN_short_description.sql`, NNNN zero-padded 4 digits.
- Migrations are append-only. Never edit a merged migration. To change something, write a new one.
- Every migration is wrapped in a transaction implicitly by Supabase. Don't add `BEGIN`/`COMMIT`.
- Every migration is reversible in principle. Add a comment block at the top explaining the rollback steps even if you don't write a `down` migration.
- Migrations run in alphabetical order. The 4-digit prefix is what makes ordering deterministic.

**Skeleton:**

```sql
-- Migration: 0007_add_blocks_table.sql
-- Adds the blocks table for v1 trust & safety.
-- Rollback: DROP TABLE blocks; (no data preservation needed pre-launch)

CREATE TABLE blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "users see own blocks"
  ON blocks FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "users insert own blocks"
  ON blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "users delete own blocks"
  ON blocks FOR DELETE
  USING (blocker_id = auth.uid());
```

**Always:** enable RLS in the same migration that creates the table. Never ship a table without RLS.

---

## 2. RLS patterns

### The default-deny rule

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
-- Without any policy, no one (except service_role and the table owner) can read or write.
-- Add policies explicitly for each access pattern you want.
```

### Self-only access

```sql
CREATE POLICY "users see own rows"
  ON my_table FOR SELECT
  USING (user_id = auth.uid());
```

### Public read of active rows

```sql
CREATE POLICY "anyone reads active posts"
  ON posts FOR SELECT
  USING (status = 'active');
```

### Block-aware read

This is the pattern Akin uses on `posts` and `comments`. The viewer must not have blocked, nor be blocked by, the author.

```sql
CREATE POLICY "anyone reads active posts (block-aware)"
  ON posts FOR SELECT
  USING (
    status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = posts.author_id)
         OR (blocker_id = posts.author_id AND blocked_id = auth.uid())
    )
  );
```

This costs a subquery per row. Mitigate by indexing `blocks(blocker_id, blocked_id)` (the PK already does this) and `blocks(blocked_id)`.

### Insert with ownership check

```sql
CREATE POLICY "users create own posts"
  ON posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.age_verified_at IS NOT NULL
      AND p.status = 'active'
    )
  );
```

Note: email confirmation and age verification are policy-enforced. Don't rely on the client.

### Update restricted to specific columns

RLS doesn't have a column allow-list. To restrict updatable columns, use a `BEFORE UPDATE` trigger that raises if forbidden columns changed:

```sql
CREATE OR REPLACE FUNCTION enforce_post_update_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'cannot change author_id';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'cannot change created_at';
  END IF;
  IF NEW.author_identifier IS DISTINCT FROM OLD.author_identifier THEN
    RAISE EXCEPTION 'cannot change author_identifier';
  END IF;
  -- Allow body, title, status changes only.
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_post_update_columns_trg
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_post_update_columns();
```

### The 15-minute edit window

```sql
CREATE POLICY "users update own posts within edit window"
  ON posts FOR UPDATE
  USING (
    author_id = auth.uid()
    AND created_at > now() - interval '15 minutes'
  );
```

### Moderator role

```sql
CREATE TABLE user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('moderator', 'admin')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own role" ON user_roles FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'admin')
  );
$$;
```

Then in policies: `USING (is_moderator())`.

`SECURITY DEFINER` is required so the function can read `user_roles` regardless of the calling user's RLS. `SET search_path = public` is required for security (prevents schema-confusion attacks).

---

## 3. Service-role boundaries

The Supabase service-role key bypasses RLS. It must NEVER ship to the client.

- Edge Functions can use the service-role key.
- The mobile app uses the anon key only.
- If you ever find yourself wanting to expose a service-role operation, write a Postgres function with `SECURITY DEFINER` and a tightly-scoped check, then grant `EXECUTE` to `authenticated`.

---

## 4. The participation-limit trigger — read this carefully

This is the most important code in the database.

### Goal

Enforce two invariants on every `comments` insert:

1. The post has at most 4 participants (1 OP + 3 commenters).
2. The commenter is not already active in 3 not-yet-full posts.

Both must hold under concurrent inserts. The trigger uses row-level locking and runs in a serializable transaction.

### Implementation

```sql
-- 0010_participation_limits.sql

CREATE OR REPLACE FUNCTION enforce_participation_limits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_full boolean;
  v_post_author uuid;
  v_already_participant boolean;
  v_active_count int;
BEGIN
  -- Lock the post row so only one comment insertion proceeds at a time per post.
  SELECT is_full, author_id
    INTO v_post_full, v_post_author
    FROM posts
    WHERE id = NEW.post_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- OP commenting on own post does not need participant check, they're already counted.
  IF NEW.author_id = v_post_author THEN
    RETURN NEW;
  END IF;

  -- Check if user is already a participant in this post.
  SELECT EXISTS (
    SELECT 1 FROM post_participants
    WHERE post_id = NEW.post_id AND user_id = NEW.author_id
  ) INTO v_already_participant;

  IF v_already_participant THEN
    -- Already in. No participant-count change. No active-count change.
    RETURN NEW;
  END IF;

  -- New commenter. Reject if post is full.
  IF v_post_full THEN
    RAISE EXCEPTION 'INSUFFICIENT_PARTICIPANT_SLOTS' USING ERRCODE = 'P0001';
  END IF;

  -- Lock the user's profile to check active count.
  SELECT active_post_count INTO v_active_count
    FROM profiles
    WHERE user_id = NEW.author_id
    FOR UPDATE;

  IF v_active_count >= 3 THEN
    RAISE EXCEPTION 'USER_ACTIVE_LIMIT_REACHED' USING ERRCODE = 'P0003';
  END IF;

  -- Admit the new participant.
  INSERT INTO post_participants (post_id, user_id) VALUES (NEW.post_id, NEW.author_id);
  UPDATE posts SET participant_count = participant_count + 1 WHERE id = NEW.post_id;
  UPDATE profiles SET active_post_count = active_post_count + 1 WHERE user_id = NEW.author_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_participation_limits_trg
  BEFORE INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_participation_limits();
```

### When a post fills, free up the participants

```sql
CREATE OR REPLACE FUNCTION decrement_active_on_full()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.participant_count = 4 AND OLD.participant_count < 4 THEN
    UPDATE profiles
       SET active_post_count = active_post_count - 1
     WHERE user_id IN (
       SELECT user_id FROM post_participants WHERE post_id = NEW.id
     );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER decrement_active_on_full_trg
  AFTER UPDATE OF participant_count ON posts
  FOR EACH ROW
  EXECUTE FUNCTION decrement_active_on_full();
```

### Initialise the OP as a participant

```sql
CREATE OR REPLACE FUNCTION add_op_as_participant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO post_participants (post_id, user_id) VALUES (NEW.id, NEW.author_id);
  UPDATE profiles SET active_post_count = active_post_count + 1 WHERE user_id = NEW.author_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER add_op_as_participant_trg
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION add_op_as_participant();
```

Note: the post creation itself must also be limited by `active_post_count`. That check goes in the RLS `WITH CHECK` clause of the posts insert policy, OR in a `BEFORE INSERT` trigger on posts that raises if `active_post_count >= 3`. Use the trigger — the RLS clause gets messy.

### Client retry policy

When a comment insert returns `40001 serialization_failure`, the client retries up to 3 times with exponential backoff (50ms, 150ms, 450ms). Beyond that, surface the error.

When a comment insert returns `INSUFFICIENT_PARTICIPANT_SLOTS` or `USER_ACTIVE_LIMIT_REACHED`, do not retry — surface the i18n message immediately.

---

## 5. Generated types

Generate TypeScript types from the live database schema after every migration:

```bash
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```

Commit `src/types/database.ts` so the codebase compiles without a live DB connection. This file is generated — never edit it by hand.

---

## 6. pgTAP testing

Every trigger, every policy, every function gets a pgTAP test in `supabase/tests/`. Tests run in CI against a fresh Supabase local instance.

### Test file structure

```sql
-- supabase/tests/participation_limits.test.sql
BEGIN;

SELECT plan(7);

-- Setup: create three users, sign them in
SELECT tests.create_user('alice@test.com');
SELECT tests.create_user('bob@test.com');
SELECT tests.create_user('carol@test.com');
SELECT tests.create_user('dave@test.com');
SELECT tests.create_user('eve@test.com');

-- Test 1: OP comments on own post — does not count toward participant cap
SELECT tests.authenticate_as('alice@test.com');
INSERT INTO posts (...) VALUES (...) RETURNING id INTO _post_id;
INSERT INTO comments (post_id, body) VALUES (_post_id, 'me again');
SELECT is(
  (SELECT participant_count FROM posts WHERE id = _post_id),
  1::int,
  'OP comment does not increment participant count'
);

-- Test 2: 4th unique commenter is rejected
SELECT tests.authenticate_as('bob@test.com');
INSERT INTO comments (post_id, body) VALUES (_post_id, 'first');
SELECT tests.authenticate_as('carol@test.com');
INSERT INTO comments (post_id, body) VALUES (_post_id, 'second');
SELECT tests.authenticate_as('dave@test.com');
INSERT INTO comments (post_id, body) VALUES (_post_id, 'third');
SELECT tests.authenticate_as('eve@test.com');
SELECT throws_ok(
  $$ INSERT INTO comments (post_id, body) VALUES ('...', 'fourth') $$,
  'INSUFFICIENT_PARTICIPANT_SLOTS',
  '4th unique commenter is rejected'
);

-- … six more tests …

SELECT * FROM finish();
ROLLBACK;
```

### Running tests locally

```bash
supabase test db
```

### Running tests in CI

GitHub Actions starts a Supabase local instance, applies migrations, runs `supabase test db`, fails on any test failure. See `.github/workflows/db-tests.yml`.

---

## 7. Indexes

Always add an index for:

- Any column used in an RLS policy `USING` or `WITH CHECK` clause.
- Any column used in a `WHERE` of a query you write.
- Any foreign key (Postgres does NOT auto-index FK columns).

Don't index just-in-case. Each index slows writes. Add indexes when a query plan shows a sequential scan on a hot path.

Use partial indexes when most rows have the same value:

```sql
CREATE INDEX posts_active_recent_idx
  ON posts (created_at DESC)
  WHERE status = 'active';
```

---

## 8. Common mistakes the agent makes — don't

- Forgetting to enable RLS on a new table. Always include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` in the migration.
- Using `SECURITY DEFINER` on a function without `SET search_path`. This is a security hole.
- Returning `auth.users` rows from a query. Never. Join via `profiles` and select `anonymous_identifier`.
- Trusting `NEW.author_id` from the client. Always check `NEW.author_id = auth.uid()` in the policy `WITH CHECK`.
- Writing a trigger that does heavy work on every row of a bulk insert. Triggers must be cheap.
- Putting business logic in the client and "reflecting" it in RLS. The DB is the source of truth, the client mirrors. Not the other way round.

---

## 9. Migration review checklist

Before merging a migration, verify:

- [ ] RLS is enabled on every new table.
- [ ] At least one policy exists for every access pattern (SELECT, INSERT, UPDATE, DELETE) you intend to allow.
- [ ] Every foreign key has a covering index.
- [ ] Every `SECURITY DEFINER` function has `SET search_path`.
- [ ] Generated types regenerated and committed.
- [ ] pgTAP tests cover the new policies and any triggers.
- [ ] No service-role-only code paths are reachable from the client.
- [ ] Rollback path documented in the comment header.
