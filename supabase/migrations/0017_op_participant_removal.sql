-- Migration: 0017_op_participant_removal.sql
-- CRITICAL-PATH: limits + moderation-adjacent
--
-- Adds OP-driven per-post participant removal. Distinct from:
--   * blocks (0007) — bidirectional, profile-wide, user-driven
--   * profile_status suspended/banned (0001) — account-wide, moderator-driven
--
-- After this migration, the post's author (OP) can remove a single commenter
-- from the conversation. Effects:
--   * INSERT into post_participant_removals.
--   * post_participants row removed; posts.participant_count decremented
--     (so the slot reopens; the generated is_full flag flips back to false).
--   * Removed user's existing comments on the post get removed_by_op = true
--     so the UI can render a [removed by OP] placeholder for remaining
--     participants.
--   * Removed user can no longer SELECT the post (posts SELECT policy filter)
--     or its comments — the post disappears entirely from their view.
--   * Removed user attempting to insert a comment raises P0004
--     REMOVED_FROM_POST via the extended participation-limits trigger.
--   * Audit log row written with action 'op_removed_participant'.
--
-- Slot accounting:
--   Case A — post NOT full before removal: removed user was active here.
--     Decrement their active_post_count by 1 (they get the slot back).
--   Case B — post WAS full before removal: all 4 participants had already
--     been decremented when the post filled. We re-increment the remaining
--     participants (capped at 3 to respect the active_post_count CHECK),
--     because the post is no longer full and they are active again. The
--     removed user is treated as "concluded" — their decremented count is
--     not restored.
--
-- Error codes:
--   P0004 REMOVED_FROM_POST  — author was removed from this conversation
--
-- Rollback:
--   ALTER TABLE public.comments DROP COLUMN IF EXISTS removed_by_op;
--   DROP POLICY  IF EXISTS "anyone reads active posts (block + removal-aware)" ON public.posts;
--   DROP POLICY  IF EXISTS "anyone reads active comments (block + removal-aware)" ON public.comments;
--   -- restore the 0007 block-aware policies (see 0007 source).
--   DROP TRIGGER  IF EXISTS apply_op_participant_removal_trg ON public.post_participant_removals;
--   DROP FUNCTION IF EXISTS public.apply_op_participant_removal();
--   DROP TABLE   IF EXISTS public.post_participant_removals;
--   -- restore the 0005 enforce_participation_limits() body (see 0005 source).

-- ---------------------------------------------------------------------------
-- 1. comments.removed_by_op column
-- ---------------------------------------------------------------------------

ALTER TABLE public.comments
  ADD COLUMN removed_by_op boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.comments.removed_by_op IS
  'Set true when the OP removes the comment author from the post (0017). '
  'The row remains selectable so remaining participants see a [removed] placeholder.';

-- ---------------------------------------------------------------------------
-- 2. post_participant_removals table
-- ---------------------------------------------------------------------------

CREATE TABLE public.post_participant_removals (
  post_id          uuid        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  removed_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  removed_by       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, removed_user_id),
  CHECK (removed_user_id <> removed_by)
);

-- Reverse lookup: "am I removed from this post?" — used by the posts SELECT policy
-- and the comment-insert guard.
CREATE INDEX post_participant_removals_removed_user_idx
  ON public.post_participant_removals (removed_user_id);

ALTER TABLE public.post_participant_removals ENABLE ROW LEVEL SECURITY;

-- INSERT: only the OP of the referenced post can insert; removed_by must be
-- the caller; the target user must currently be a participant (other than OP).
CREATE POLICY "op inserts participant removal"
  ON public.post_participant_removals FOR INSERT
  WITH CHECK (
    removed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.posts p
       WHERE p.id = post_id
         AND p.author_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.post_participants pp
       WHERE pp.post_id = post_participant_removals.post_id
         AND pp.user_id = post_participant_removals.removed_user_id
    )
  );

-- SELECT: the OP and the removed user can see the row (used by client logic).
-- Moderators can see all (for audit).
CREATE POLICY "op and removed user see removal"
  ON public.post_participant_removals FOR SELECT
  USING (
    removed_by = auth.uid()
       OR removed_user_id = auth.uid()
       OR public.is_moderator()
  );

-- No UPDATE / DELETE policy — removals are append-only in v1.

-- ---------------------------------------------------------------------------
-- 3. Trigger: apply the side effects of a removal
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_op_participant_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_full boolean;
BEGIN
  -- Lock the post row. Serializes against concurrent comment inserts and
  -- against any other removal on the same post.
  SELECT (participant_count >= 4)
    INTO v_was_full
    FROM public.posts
   WHERE id = NEW.post_id
   FOR UPDATE;

  -- 1. Remove from participants. Must happen before participant_count update.
  DELETE FROM public.post_participants
   WHERE post_id = NEW.post_id
     AND user_id = NEW.removed_user_id;

  -- 2. Decrement participant_count. The generated is_full flag flips automatically.
  UPDATE public.posts
     SET participant_count = participant_count - 1
   WHERE id = NEW.post_id;

  -- 3. Slot accounting.
  IF NOT v_was_full THEN
    -- Case A: post was open. Removed user was counted active. Give them the slot back.
    UPDATE public.profiles
       SET active_post_count = GREATEST(active_post_count - 1, 0)
     WHERE user_id = NEW.removed_user_id;
  ELSE
    -- Case B: post was full. All 4 had been freed at fill. The remaining 3
    -- are active again now that the post un-fulls. Re-charge them.
    UPDATE public.profiles
       SET active_post_count = LEAST(active_post_count + 1, 3)
     WHERE user_id IN (
       SELECT user_id FROM public.post_participants
        WHERE post_id = NEW.post_id
     );
    -- The removed user is treated as "concluded" — their freed slot stays.
  END IF;

  -- 4. Mark the removed user's existing comments so the UI can render a placeholder.
  UPDATE public.comments
     SET removed_by_op = true
   WHERE post_id = NEW.post_id
     AND author_id = NEW.removed_user_id;

  -- 5. Audit
  PERFORM public.log_audit(
    NEW.removed_by,
    'op_removed_participant',
    'post',
    NEW.post_id,
    jsonb_build_object('removed_user_id', NEW.removed_user_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_op_participant_removal_trg
  AFTER INSERT ON public.post_participant_removals
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_op_participant_removal();

-- ---------------------------------------------------------------------------
-- 4. Extend enforce_participation_limits to reject removed users
--    (raises P0004 BEFORE the post-not-found / slot / active-count checks)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_participation_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_full       boolean;
  v_post_author     uuid;
  v_already_in      boolean;
  v_active_count    int;
  v_is_removed      boolean;
BEGIN
  -- Lock the post row.
  SELECT is_full, author_id
    INTO v_post_full, v_post_author
    FROM public.posts
    WHERE id = NEW.post_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- New in 0017: removed users cannot comment. OP is never on the removals
  -- table (CHECK enforces removed_user_id <> removed_by, and the INSERT
  -- policy requires removed_by = post.author_id), so this check is safely
  -- bypassed for the OP.
  SELECT EXISTS (
    SELECT 1 FROM public.post_participant_removals
     WHERE post_id = NEW.post_id
       AND removed_user_id = NEW.author_id
  ) INTO v_is_removed;

  IF v_is_removed THEN
    RAISE EXCEPTION 'REMOVED_FROM_POST' USING ERRCODE = 'P0004';
  END IF;

  -- OP commenting on own post: already a participant.
  IF NEW.author_id = v_post_author THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.post_participants
     WHERE post_id = NEW.post_id AND user_id = NEW.author_id
  ) INTO v_already_in;

  IF v_already_in THEN
    RETURN NEW;
  END IF;

  IF v_post_full THEN
    RAISE EXCEPTION 'INSUFFICIENT_PARTICIPANT_SLOTS' USING ERRCODE = 'P0001';
  END IF;

  SELECT active_post_count
    INTO v_active_count
    FROM public.profiles
    WHERE user_id = NEW.author_id
    FOR UPDATE;

  IF v_active_count >= 3 THEN
    RAISE EXCEPTION 'USER_ACTIVE_LIMIT_REACHED' USING ERRCODE = 'P0003';
  END IF;

  INSERT INTO public.post_participants (post_id, user_id)
    VALUES (NEW.post_id, NEW.author_id);

  UPDATE public.profiles
     SET active_post_count = active_post_count + 1
   WHERE user_id = NEW.author_id;

  UPDATE public.posts
     SET participant_count = participant_count + 1
   WHERE id = NEW.post_id;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Replace posts SELECT policy: hide post from removed user
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "anyone reads active posts (block-aware)" ON public.posts;

CREATE POLICY "anyone reads active posts (block + removal-aware)"
  ON public.posts FOR SELECT
  USING (
    status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks
       WHERE (blocker_id = auth.uid() AND blocked_id = posts.author_id)
          OR (blocker_id = posts.author_id AND blocked_id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.post_participant_removals
       WHERE post_id = posts.id
         AND removed_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Replace comments SELECT policy: hide comments from removed user
--    (defense-in-depth — post is already hidden, but a direct comments query
--     by post_id would otherwise return rows)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "anyone reads active comments (block-aware)" ON public.comments;

CREATE POLICY "anyone reads active comments (block + removal-aware)"
  ON public.comments FOR SELECT
  USING (
    status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks
       WHERE (blocker_id = auth.uid() AND blocked_id = comments.author_id)
          OR (blocker_id = comments.author_id AND blocked_id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.post_participant_removals
       WHERE post_id = comments.post_id
         AND removed_user_id = auth.uid()
    )
  );
