-- Migration 0015: Account soft-delete column, 30-day purge job, supporting index.
-- Depends on 0014 which added the 'deleted' enum value to profile_status.

-- CRITICAL-PATH: auth privacy — pending expert review

-- 1. Add deleted_at column -------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.profiles.deleted_at IS
  'Set when the user requests account deletion. Hard delete occurs 30 days later via pg_cron.';

-- 2. Enforce purge schedule via pg_cron ------------------------------------
-- pg_cron must be enabled on the Supabase project (Extensions → pg_cron).
-- The job runs at 03:00 UTC daily and hard-deletes profiles soft-deleted >30 days ago.

DO $purge$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'purge-deleted-accounts',
      '0 3 * * *',
      $cron$
        DELETE FROM public.profiles
        WHERE status = 'deleted'
          AND deleted_at IS NOT NULL
          AND deleted_at < now() - interval '30 days';
      $cron$
    );
  END IF;
END;
$purge$;

-- 3. Index to support the purge query efficiently --------------------------
CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx
  ON public.profiles (deleted_at)
  WHERE status = 'deleted' AND deleted_at IS NOT NULL;
