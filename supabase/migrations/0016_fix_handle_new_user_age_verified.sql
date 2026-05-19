-- Migration: 0016_fix_handle_new_user_age_verified.sql
-- CRITICAL-PATH: auth
--
-- Bug: the RLS INSERT policy on public.posts requires
--   profiles.age_verified_at IS NOT NULL
-- but handle_new_user (0001) created profiles with age_verified_at = NULL,
-- even though signUp() passes age_verified_at in raw_user_meta_data.
-- Result: every post INSERT was silently rejected by RLS.
--
-- Fix: read age_verified_at from NEW.raw_user_meta_data when creating the
-- profile. Also backfills existing profiles that still have NULL by reading
-- from auth.users.raw_user_meta_data.
--
-- Rollback:
--   Revert handle_new_user to the 0001 version (no age_verified_at column).
--   The backfill UPDATE cannot be rolled back without a point-in-time restore.

-- ---------------------------------------------------------------------------
-- 1. Replace handle_new_user to copy age_verified_at from user metadata
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, anonymous_identifier, age_verified_at)
  VALUES (
    NEW.id,
    'pending_' || substr(NEW.id::text, 1, 8),
    (NEW.raw_user_meta_data->>'age_verified_at')::timestamptz
  );
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Backfill existing profiles that have age_verified_at = NULL
--    (affects dev/staging accounts created before this migration)
-- ---------------------------------------------------------------------------

UPDATE public.profiles p
SET    age_verified_at = (u.raw_user_meta_data->>'age_verified_at')::timestamptz
FROM   auth.users u
WHERE  p.user_id = u.id
  AND  p.age_verified_at IS NULL
  AND  u.raw_user_meta_data->>'age_verified_at' IS NOT NULL;
