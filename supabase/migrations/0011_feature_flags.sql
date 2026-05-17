-- Migration: 0011_feature_flags.sql
-- Feature-flag kill-switches. The client polls this table every 60s.
-- Default: all flags ON (safe for development; turn off before incidents).
--
-- Rollback:
--   DROP TABLE IF EXISTS public.feature_flags;

CREATE TABLE public.feature_flags (
  key         text        PRIMARY KEY,
  value       boolean     NOT NULL DEFAULT true,
  description text        NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Public read — the client needs this without authentication
CREATE POLICY "feature flags are publicly readable"
  ON public.feature_flags FOR SELECT
  USING (true);

-- No INSERT / UPDATE / DELETE policies: only service_role can toggle flags.

-- ---------------------------------------------------------------------------
-- Seed: three kill-switches from CLAUDE.md §10
-- ---------------------------------------------------------------------------

INSERT INTO public.feature_flags (key, value, description) VALUES
  ('signups_open', true,
   'When false, new signup attempts return a friendly "we are full" message. Use during App Store review or moderation overload.'),
  ('posting_open', true,
   'When false, post and comment creation is disabled with a friendly message. Use during incidents.'),
  ('realtime_open', true,
   'When false, realtime subscriptions are disabled. Use to reduce Supabase load during traffic spikes.');
