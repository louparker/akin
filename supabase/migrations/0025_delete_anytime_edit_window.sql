-- Migration: 0025_delete_anytime_edit_window.sql
-- Lets authors soft-delete their own post or comment at ANY time, while keeping
-- content EDITS limited to the 15-minute window.
--
-- Before: the UPDATE RLS policy gated *every* update — including the
-- status→deleted soft-delete — to `created_at > now() - 15 minutes`, so a user
-- could not remove their own content after the window closed.
--
-- After:
--   * RLS UPDATE policy → ownership-only (the time gate is removed).
--   * The 15-minute edit window moves into the enforce_*_update_columns
--     triggers, which run BEFORE UPDATE and can see which columns changed.
--     A body/title change outside the window raises P0021; a status
--     active→deleted change is always allowed.
--   * Column immutability and the service-role bypass are preserved exactly
--     (posts from 0004, comments from 0021).
--
-- Rollback:
--   DROP POLICY IF EXISTS "authors update own posts"    ON public.posts;
--   DROP POLICY IF EXISTS "authors update own comments" ON public.comments;
--   -- then restore the policies + function bodies from 0004 / 0021.

-- ---------------------------------------------------------------------------
-- 1. posts: ownership-only UPDATE policy (drop the time gate)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "authors update own posts within edit window" ON public.posts;

CREATE POLICY "authors update own posts"
  ON public.posts FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. comments: ownership-only UPDATE policy (drop the time gate)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "authors update own comments within edit window" ON public.comments;

CREATE POLICY "authors update own comments"
  ON public.comments FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. posts trigger: keep every column guard, add the edit-window check
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_post_update_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Internal trigger functions are SECURITY DEFINER (run as 'postgres').
  -- Bypass all column guards for internal / service-role operations.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change author_id'
      USING ERRCODE = 'P0020';
  END IF;
  IF NEW.author_identifier IS DISTINCT FROM OLD.author_identifier THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change author_identifier'
      USING ERRCODE = 'P0020';
  END IF;
  IF NEW.category IS DISTINCT FROM OLD.category THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change category'
      USING ERRCODE = 'P0020';
  END IF;
  IF NEW.language IS DISTINCT FROM OLD.language THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change language'
      USING ERRCODE = 'P0020';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change created_at'
      USING ERRCODE = 'P0020';
  END IF;
  IF NEW.participant_count IS DISTINCT FROM OLD.participant_count THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change participant_count directly'
      USING ERRCODE = 'P0020';
  END IF;
  IF NEW.comment_count IS DISTINCT FROM OLD.comment_count THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change comment_count directly'
      USING ERRCODE = 'P0020';
  END IF;
  -- Soft-delete: only 'active' → 'deleted' allowed by the author, at any time.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'active' AND NEW.status = 'deleted') THEN
      RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: status can only change active→deleted'
        USING ERRCODE = 'P0020';
    END IF;
  END IF;
  -- Edit window: body/title may only change within 15 minutes of creation.
  IF (NEW.body IS DISTINCT FROM OLD.body OR NEW.title IS DISTINCT FROM OLD.title)
     AND OLD.created_at <= now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'EDIT_WINDOW_CLOSED: edits are only allowed within 15 minutes of posting'
      USING ERRCODE = 'P0021';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. comments trigger: keep every column guard (incl. the 0021 bypass),
--    add the edit-window check
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_comment_update_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Bypass all column guards for internal / service-role operations (0021).
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change author_id'
      USING ERRCODE = 'P0020';
  END IF;
  IF NEW.author_identifier IS DISTINCT FROM OLD.author_identifier THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change author_identifier'
      USING ERRCODE = 'P0020';
  END IF;
  IF NEW.post_id IS DISTINCT FROM OLD.post_id THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change post_id'
      USING ERRCODE = 'P0020';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change created_at'
      USING ERRCODE = 'P0020';
  END IF;
  -- Soft-delete: only 'active' → 'deleted' allowed by the author, at any time.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'active' AND NEW.status = 'deleted') THEN
      RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: status can only change active→deleted'
        USING ERRCODE = 'P0020';
    END IF;
  END IF;
  -- Edit window: body may only change within 15 minutes of creation.
  IF NEW.body IS DISTINCT FROM OLD.body
     AND OLD.created_at <= now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'EDIT_WINDOW_CLOSED: edits are only allowed within 15 minutes of posting'
      USING ERRCODE = 'P0021';
  END IF;
  RETURN NEW;
END;
$$;
