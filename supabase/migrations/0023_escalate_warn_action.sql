-- Migration 0023: warn action escalates based on strike_count.
-- Implements Phase 7 Task 7.7 acceptance criteria, which 0020 missed:
--   strike 0 + warn → just warn (strike → 1, status stays 'active')
--   strike 1 + warn → auto-suspend for 7 days (strike → 2)
--   strike 2 + warn → auto-ban + hide all content (strike → 3)
--
-- A moderator can still pick 'suspend' or 'ban' directly to skip ahead
-- (e.g. severe action on first offence) — those branches are unchanged.
--
-- Audit log labels for the escalation paths:
--   user.warned          — strike 1 (manual or first-time)
--   user.suspended.auto  — strike 2 escalation from a warn click
--   user.banned.auto     — strike 3 escalation from a warn click
--
-- The .auto suffix lets the audit viewer distinguish moderator-driven
-- actions (user.suspended, user.banned) from system-driven escalations.
--
-- CRITICAL-PATH: moderation — pending human expert review before production.
--
-- Rollback:
--   See migration 0020 for the original definition; re-apply that body to revert.

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
  v_report           public.reports%ROWTYPE;
  v_actor_id         uuid := auth.uid();
  v_target_user_id   uuid;
  v_new_strike_count int;
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

  -- ── WARN (with escalation per Task 7.7) ──────────────────────────────────
  IF p_action = 'warn' THEN
    -- Lock the row, compute the post-increment count, decide the path.
    SELECT strike_count + 1 INTO v_new_strike_count
      FROM public.profiles
     WHERE user_id = v_target_user_id
       FOR UPDATE;

    IF v_new_strike_count >= 3 THEN
      -- Strike 3 → auto-ban: hide all content + ban.
      UPDATE public.posts SET status = 'hidden'
       WHERE author_id = v_target_user_id AND status = 'active';
      UPDATE public.comments SET status = 'hidden'
       WHERE author_id = v_target_user_id AND status = 'active';
      UPDATE public.profiles
         SET status = 'banned',
             strike_count = v_new_strike_count,
             updated_at = now()
       WHERE user_id = v_target_user_id;
      UPDATE public.reports
         SET status = 'actioned', reviewed_by = v_actor_id, reviewed_at = now()
       WHERE id = p_report_id;
      PERFORM log_audit(v_actor_id, 'user.banned.auto', 'user', v_target_user_id,
        jsonb_build_object('report_id', p_report_id,
                           'reason', p_reason,
                           'escalated_from', 'warn',
                           'strike_count', v_new_strike_count));
      RETURN;
    ELSIF v_new_strike_count = 2 THEN
      -- Strike 2 → auto-suspend for 7 days.
      UPDATE public.profiles
         SET status = 'suspended',
             suspended_until = now() + interval '7 days',
             strike_count = v_new_strike_count,
             updated_at = now()
       WHERE user_id = v_target_user_id;
      UPDATE public.reports
         SET status = 'actioned', reviewed_by = v_actor_id, reviewed_at = now()
       WHERE id = p_report_id;
      PERFORM log_audit(v_actor_id, 'user.suspended.auto', 'user', v_target_user_id,
        jsonb_build_object('report_id', p_report_id,
                           'reason', p_reason,
                           'escalated_from', 'warn',
                           'strike_count', v_new_strike_count,
                           'duration_days', 7));
      RETURN;
    ELSE
      -- Strike 1 → just warn.
      UPDATE public.profiles
         SET strike_count = v_new_strike_count,
             updated_at = now()
       WHERE user_id = v_target_user_id;
      UPDATE public.reports
         SET status = 'actioned', reviewed_by = v_actor_id, reviewed_at = now()
       WHERE id = p_report_id;
      PERFORM log_audit(v_actor_id, 'user.warned', 'user', v_target_user_id,
        jsonb_build_object('report_id', p_report_id, 'reason', p_reason));
      RETURN;
    END IF;
  END IF;

  -- ── SUSPEND (direct moderator override — unchanged from 0020) ────────────
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

  -- ── BAN (direct moderator override — unchanged from 0020) ────────────────
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

  -- ── CSAM — zero tolerance (unchanged from 0020) ───────────────────────────
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

GRANT EXECUTE ON FUNCTION public.moderate_report(uuid, text, text)
  TO authenticated;
