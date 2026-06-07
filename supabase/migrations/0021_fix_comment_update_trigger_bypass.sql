-- Migration: 0021_fix_comment_update_trigger_bypass.sql
-- Bug fix: enforce_comment_update_columns was missing the internal-bypass guard
-- that enforce_post_update_columns has. The ban action in moderate_report sets
-- comment status to 'hidden', which the trigger rejected with P0020 because the
-- only allowed client transition was active→deleted.
--
-- Fix: add the same current_user bypass that the posts trigger uses, so
-- SECURITY DEFINER functions (moderate_report, future Edge Functions) can
-- update comments freely.
--
-- Rollback:
--   See 0004_edit_window.sql for the original function body.

CREATE OR REPLACE FUNCTION public.enforce_comment_update_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
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
