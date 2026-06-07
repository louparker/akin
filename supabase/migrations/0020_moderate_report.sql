-- Migration: 0020_moderate_report.sql
-- SECURITY DEFINER function moderate_report() — single transaction wrapping
-- every moderator action: applies the consequence, updates the report status,
-- and writes an audit_log row.  No moderator action can escape the audit log.
--
-- CRITICAL-PATH: moderation — pending human expert review before production.
--
-- Actions:
--   dismiss    — close the report with no consequence.
--   hide       — set target post or comment status = 'hidden'.
--   warn       — increment profile strike_count.
--   suspend    — set profile status = 'suspended' + suspended_until = now+7d,
--                increment strike_count.
--   ban        — set profile status = 'banned', hide all their content,
--                increment strike_count.
--   csam       — immediate ban + hide + audit flag for ECPAT/NCMEC export.
--
-- Error codes:
--   P0400  INVALID_ACTION
--   P0401  FORBIDDEN
--   P0404  REPORT_NOT_FOUND
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.moderate_report(uuid, text, text);

CREATE OR REPLACE FUNCTION public.moderate_report(
  p_report_id   uuid,
  p_action      text,
  p_reason      text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report         public.reports%ROWTYPE;
  v_actor_id       uuid := auth.uid();
  v_target_user_id uuid;
BEGIN
  -- ── Gate ────────────────────────────────────────────────────────────────────
  IF NOT is_moderator() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0401';
  END IF;

  IF trim(p_reason) = '' THEN
    RAISE EXCEPTION 'REASON_REQUIRED' USING ERRCODE = 'P0400';
  END IF;

  -- ── Fetch & lock the report ───────────────────────────────────────────────
  SELECT * INTO v_report
    FROM public.reports
   WHERE id = p_report_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REPORT_NOT_FOUND' USING ERRCODE = 'P0404';
  END IF;

  -- ── Resolve the target user ──────────────────────────────────────────────
  IF v_report.target_type = 'post' THEN
    SELECT author_id INTO v_target_user_id
      FROM public.posts WHERE id = v_report.target_id;
  ELSIF v_report.target_type = 'comment' THEN
    SELECT author_id INTO v_target_user_id
      FROM public.comments WHERE id = v_report.target_id;
  ELSIF v_report.target_type = 'user' THEN
    v_target_user_id := v_report.target_id;
  END IF;

  -- ── DISMISS ───────────────────────────────────────────────────────────────
  IF p_action = 'dismiss' THEN
    UPDATE public.reports
       SET status = 'dismissed', reviewed_by = v_actor_id, reviewed_at = now()
     WHERE id = p_report_id;
    PERFORM log_audit(v_actor_id, 'report.dismissed',
      v_report.target_type::text, v_report.target_id,
      jsonb_build_object('report_id', p_report_id, 'reason', p_reason));
    RETURN;
  END IF;

  -- ── HIDE ──────────────────────────────────────────────────────────────────
  IF p_action = 'hide' THEN
    IF v_report.target_type = 'post' THEN
      UPDATE public.posts SET status = 'hidden' WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'comment' THEN
      UPDATE public.comments SET status = 'hidden' WHERE id = v_report.target_id;
    END IF;
    UPDATE public.reports
       SET status = 'actioned', reviewed_by = v_actor_id, reviewed_at = now()
     WHERE id = p_report_id;
    PERFORM log_audit(v_actor_id, 'content.hidden',
      v_report.target_type::text, v_report.target_id,
      jsonb_build_object('report_id', p_report_id, 'reason', p_reason));
    RETURN;
  END IF;

  -- ── WARN ──────────────────────────────────────────────────────────────────
  IF p_action = 'warn' THEN
    UPDATE public.profiles
       SET strike_count = strike_count + 1, updated_at = now()
     WHERE user_id = v_target_user_id;
    UPDATE public.reports
       SET status = 'actioned', reviewed_by = v_actor_id, reviewed_at = now()
     WHERE id = p_report_id;
    PERFORM log_audit(v_actor_id, 'user.warned', 'user', v_target_user_id,
      jsonb_build_object('report_id', p_report_id, 'reason', p_reason));
    RETURN;
  END IF;

  -- ── SUSPEND ───────────────────────────────────────────────────────────────
  IF p_action = 'suspend' THEN
    UPDATE public.profiles
       SET status = 'suspended',
           suspended_until = now() + interval '7 days',
           strike_count = strike_count + 1,
           updated_at = now()
     WHERE user_id = v_target_user_id;
    UPDATE public.reports
       SET status = 'actioned', reviewed_by = v_actor_id, reviewed_at = now()
     WHERE id = p_report_id;
    PERFORM log_audit(v_actor_id, 'user.suspended', 'user', v_target_user_id,
      jsonb_build_object('report_id', p_report_id, 'reason', p_reason,
                         'duration_days', 7));
    RETURN;
  END IF;

  -- ── BAN ───────────────────────────────────────────────────────────────────
  IF p_action = 'ban' THEN
    UPDATE public.posts SET status = 'hidden'
     WHERE author_id = v_target_user_id AND status = 'active';
    UPDATE public.comments SET status = 'hidden'
     WHERE author_id = v_target_user_id AND status = 'active';
    UPDATE public.profiles
       SET status = 'banned', strike_count = strike_count + 1, updated_at = now()
     WHERE user_id = v_target_user_id;
    UPDATE public.reports
       SET status = 'actioned', reviewed_by = v_actor_id, reviewed_at = now()
     WHERE id = p_report_id;
    PERFORM log_audit(v_actor_id, 'user.banned', 'user', v_target_user_id,
      jsonb_build_object('report_id', p_report_id, 'reason', p_reason));
    RETURN;
  END IF;

  -- ── CSAM — zero tolerance ─────────────────────────────────────────────────
  IF p_action = 'csam' THEN
    -- Hide the specific content
    IF v_report.target_type = 'post' THEN
      UPDATE public.posts SET status = 'hidden' WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'comment' THEN
      UPDATE public.comments SET status = 'hidden' WHERE id = v_report.target_id;
    END IF;
    -- Permanent ban + hide all content
    UPDATE public.posts SET status = 'hidden'
     WHERE author_id = v_target_user_id AND status = 'active';
    UPDATE public.comments SET status = 'hidden'
     WHERE author_id = v_target_user_id AND status = 'active';
    UPDATE public.profiles
       SET status = 'banned', strike_count = strike_count + 1, updated_at = now()
     WHERE user_id = v_target_user_id;
    UPDATE public.reports
       SET status = 'actioned', reviewed_by = v_actor_id, reviewed_at = now()
     WHERE id = p_report_id;
    -- Audit with csam=true flag so the ECPAT/NCMEC export job can find these rows.
    PERFORM log_audit(v_actor_id, 'user.banned.csam', 'user', v_target_user_id,
      jsonb_build_object('report_id', p_report_id, 'reason', p_reason,
                         'csam', true,
                         'target_content_id', v_report.target_id,
                         'target_content_type', v_report.target_type::text));
    RETURN;
  END IF;

  RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE = 'P0400';
END;
$$;

-- Grant execute to authenticated users; is_moderator() gate inside the function
-- prevents non-moderators from causing any effect.
GRANT EXECUTE ON FUNCTION public.moderate_report(uuid, text, text)
  TO authenticated;
