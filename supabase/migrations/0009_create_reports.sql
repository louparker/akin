-- Migration: 0008_create_reports.sql
-- Report intake table + rate-limit trigger.
-- CRITICAL-PATH: moderation
--
-- Rollback:
--   DROP TRIGGER  IF EXISTS enforce_report_rate_limit_trg ON public.reports;
--   DROP FUNCTION IF EXISTS public.enforce_report_rate_limit();
--   DROP TABLE    IF EXISTS public.reports;
--   DROP TYPE     IF EXISTS public.report_reason;
--   DROP TYPE     IF EXISTS public.report_target;
--   DROP TYPE     IF EXISTS public.report_status;

CREATE TYPE public.report_reason AS ENUM (
  'harassment', 'hate', 'spam', 'sexual', 'threat', 'off_topic', 'other'
);

CREATE TYPE public.report_target AS ENUM ('post', 'comment', 'user');

CREATE TYPE public.report_status AS ENUM ('open', 'reviewed', 'actioned', 'dismissed');

CREATE TABLE public.reports (
  id           uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type  public.report_target NOT NULL,
  target_id    uuid              NOT NULL,
  reason       public.report_reason NOT NULL,
  notes        text,
  status       public.report_status NOT NULL DEFAULT 'open',
  reviewed_by  uuid              REFERENCES auth.users(id),
  reviewed_at  timestamptz,
  created_at   timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX reports_status_created_idx ON public.reports (status, created_at);
CREATE INDEX reports_reporter_idx       ON public.reports (reporter_id, created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Reporter sees own reports only
CREATE POLICY "reporters see own reports"
  ON public.reports FOR SELECT
  USING (reporter_id = auth.uid() OR is_moderator());

-- Insert: own reports only, no self-reporting users
CREATE POLICY "users file reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    reporter_id = auth.uid()
    AND NOT (target_type = 'user' AND target_id = auth.uid())
  );

-- Moderators update status
CREATE POLICY "moderators update reports"
  ON public.reports FOR UPDATE
  USING (is_moderator())
  WITH CHECK (is_moderator());

-- No DELETE policy — reports are never deleted.

-- ---------------------------------------------------------------------------
-- Trigger: rate-limit — max 5 reports per hour per reporter
-- CRITICAL-PATH: moderation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_report_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.reports
   WHERE reporter_id = NEW.reporter_id
     AND created_at > now() - interval '1 hour';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'REPORT_RATE_LIMIT' USING ERRCODE = 'P0030';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_report_rate_limit_trg
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_report_rate_limit();
