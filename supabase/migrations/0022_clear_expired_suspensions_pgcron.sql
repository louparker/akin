-- Migration 0022: clear expired suspensions via pg_cron.
-- Once profiles.suspended_until lapses, the profile's status should revert to
-- 'active'. Without this job, status stays 'suspended' forever, which:
--   1. Hides the user from public-read RLS policies (USING (status='active')),
--      so their identifier disappears from feed reads even after their
--      lockout lifts.
--   2. Leaves the data inconsistent with the boot guard in app/_layout.tsx
--      and the routeAfterSignIn helper, both of which treat
--      suspended_until < now() as "no longer suspended."
--
-- The client-side helpers handle the user experience in real time; this job
-- exists to keep the database in sync.

-- CRITICAL-PATH: moderation lifecycle — pending expert review

-- 1. Backfill any rows already in the inconsistent state before scheduling
--    the recurring job so first-run impact is bounded.
UPDATE public.profiles
SET status = 'active',
    suspended_until = NULL
WHERE status = 'suspended'
  AND suspended_until IS NOT NULL
  AND suspended_until < now();

-- 2. Schedule the recurring cleanup. Hourly cadence — the user-facing checks
--    already handle the gap, so this exists purely for DB consistency.
DO $clear$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'clear-expired-suspensions',
      '0 * * * *',
      $cron$
        UPDATE public.profiles
        SET status = 'active',
            suspended_until = NULL
        WHERE status = 'suspended'
          AND suspended_until IS NOT NULL
          AND suspended_until < now();
      $cron$
    );
  END IF;
END;
$clear$;

-- 3. Index to keep the recurring scan cheap as the table grows.
CREATE INDEX IF NOT EXISTS profiles_suspended_until_idx
  ON public.profiles (suspended_until)
  WHERE status = 'suspended' AND suspended_until IS NOT NULL;
