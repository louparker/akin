-- Migration: 0004_edit_window.sql
-- Adds UPDATE policies restricting edits to own content within 15 minutes,
-- and a BEFORE UPDATE trigger that enforces which columns may change.
--
-- Rollback:
--   DROP TRIGGER  IF EXISTS enforce_post_update_columns_trg    ON public.posts;
--   DROP TRIGGER  IF EXISTS enforce_comment_update_columns_trg ON public.comments;
--   DROP FUNCTION IF EXISTS public.enforce_post_update_columns();
--   DROP FUNCTION IF EXISTS public.enforce_comment_update_columns();
--   DROP POLICY   IF EXISTS "authors update own posts within edit window"   ON public.posts;
--   DROP POLICY   IF EXISTS "authors update own comments within edit window" ON public.comments;

-- ---------------------------------------------------------------------------
-- posts UPDATE policy — own, within 15 minutes
-- ---------------------------------------------------------------------------

CREATE POLICY "authors update own posts within edit window"
  ON public.posts FOR UPDATE
  USING (
    author_id = auth.uid()
    AND created_at > now() - interval '15 minutes'
  )
  WITH CHECK (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- comments UPDATE policy — own, within 15 minutes
-- ---------------------------------------------------------------------------

CREATE POLICY "authors update own comments within edit window"
  ON public.comments FOR UPDATE
  USING (
    author_id = auth.uid()
    AND created_at > now() - interval '15 minutes'
  )
  WITH CHECK (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Trigger: restrict which columns may be updated on posts
-- Allowed: body, title, status (self soft-delete), updated_at.
-- Everything else is immutable once created.
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
  -- participant_count, comment_count, spice_* are managed exclusively by
  -- SECURITY DEFINER trigger functions (already bypassed above for postgres).
  -- This branch is only reached by 'authenticated' or 'anon'.
  IF NEW.participant_count IS DISTINCT FROM OLD.participant_count THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change participant_count directly'
      USING ERRCODE = 'P0020';
  END IF;
  IF NEW.comment_count IS DISTINCT FROM OLD.comment_count THEN
    RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: cannot change comment_count directly'
      USING ERRCODE = 'P0020';
  END IF;
  -- Soft-delete: only 'active' → 'deleted' allowed by the author.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'active' AND NEW.status = 'deleted') THEN
      RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: status can only change active→deleted'
        USING ERRCODE = 'P0020';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_post_update_columns_trg
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_post_update_columns();

-- ---------------------------------------------------------------------------
-- Trigger: restrict which columns may be updated on comments
-- Allowed: body, status (self soft-delete).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_comment_update_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
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
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'active' AND NEW.status = 'deleted') THEN
      RAISE EXCEPTION 'UPDATE_NOT_ALLOWED: status can only change active→deleted'
        USING ERRCODE = 'P0020';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_comment_update_columns_trg
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_comment_update_columns();
