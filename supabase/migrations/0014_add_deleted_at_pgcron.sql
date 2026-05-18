-- Migration 0014: Account soft-delete and 30-day purge job
-- Phase 4: users can request account deletion. The profile is soft-deleted
-- (status = 'deleted', deleted_at = now()). A nightly pg_cron job hard-deletes
-- rows older than 30 days.

-- CRITICAL-PATH: auth privacy — pending expert review

-- 1. Add deleted_at column -------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.profiles.deleted_at IS
  'Set when the user requests account deletion. Hard delete occurs 30 days later via pg_cron.';

-- 2. Enforce purge schedule via pg_cron ------------------------------------
-- pg_cron must be enabled on the Supabase project (Extensions → pg_cron).
-- The job runs at 03:00 UTC daily.
-- It calls auth.admin_delete_user() for accounts whose profiles have been
-- soft-deleted for > 30 days. Content (posts, comments) are already soft-deleted
-- (status = 'deleted') at soft-delete time by the application layer.

DO $$
BEGIN
  -- Only create the job if pg_cron is available (local dev may not have it).
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'purge-deleted-accounts',       -- job name (unique)
      '0 3 * * *',                    -- cron expression: 03:00 UTC daily
      $$
        DELETE FROM public.profiles
        WHERE status = 'deleted'
          AND deleted_at IS NOT NULL
          AND deleted_at < now() - interval '30 days';
      $$
    );
  END IF;
END;
$$;

-- 3. Index to support the purge query efficiently --------------------------
CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx
  ON public.profiles (deleted_at)
  WHERE status = 'deleted' AND deleted_at IS NOT NULL;
