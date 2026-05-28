-- supabase/tests/deleted_at_purge.test.sql
-- pgTAP tests for 0015_deleted_at_column_and_purge.sql
--
-- Asserts:
--   1. profiles.deleted_at column exists (timestamptz, nullable).
--   2. The partial index profiles_deleted_at_idx exists.
--   3. The purge SQL deletes profiles soft-deleted MORE than 30 days ago.
--   4. The purge SQL does NOT delete profiles soft-deleted LESS than 30 days ago.
--   5. The purge SQL does NOT delete active profiles (status != 'deleted').
--   6. The purge SQL does NOT delete profiles with status='deleted' but deleted_at IS NULL.
--
-- Note: we test the purge body directly, not pg_cron firing. pg_cron is not
-- guaranteed to be enabled in the local test environment, and even if it is,
-- waiting for 03:00 UTC in a test is not viable. The cron job itself just
-- runs the same SQL we exercise here.

BEGIN;

SELECT plan(8);

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.create_user_with_profile(p_email text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := extensions.uuid_generate_v4();
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role
  )
  VALUES (
    v_user_id, p_email, 'x', now(),
    now(), now(), '{}', '{}', 'authenticated', 'authenticated'
  );
  RETURN v_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Test 1 + 2: column exists, correct type
-- ---------------------------------------------------------------------------
SELECT has_column('public', 'profiles', 'deleted_at',
  'profiles.deleted_at column exists');

SELECT col_type_is('public', 'profiles', 'deleted_at', 'timestamp with time zone',
  'deleted_at is timestamptz');

-- ---------------------------------------------------------------------------
-- Test 3: supporting partial index exists
-- ---------------------------------------------------------------------------
SELECT has_index('public', 'profiles', 'profiles_deleted_at_idx',
  'profiles_deleted_at_idx supporting index exists');

-- ---------------------------------------------------------------------------
-- Seed four profiles representing each retention scenario
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_old_deleted  uuid;  -- status=deleted, deleted_at = 31 days ago  -> SHOULD purge
  v_new_deleted  uuid;  -- status=deleted, deleted_at = 5 days ago   -> KEEP
  v_active       uuid;  -- status=active, deleted_at NULL            -> KEEP
  v_orphan       uuid;  -- status=deleted, deleted_at NULL           -> KEEP
BEGIN
  v_old_deleted := tests.create_user_with_profile('old_deleted@purge.test');
  v_new_deleted := tests.create_user_with_profile('new_deleted@purge.test');
  v_active      := tests.create_user_with_profile('active@purge.test');
  v_orphan      := tests.create_user_with_profile('orphan@purge.test');

  UPDATE public.profiles
    SET status = 'deleted', deleted_at = now() - interval '31 days'
    WHERE user_id = v_old_deleted;

  UPDATE public.profiles
    SET status = 'deleted', deleted_at = now() - interval '5 days'
    WHERE user_id = v_new_deleted;

  UPDATE public.profiles
    SET status = 'deleted', deleted_at = NULL
    WHERE user_id = v_orphan;

  PERFORM set_config('tests.old_deleted', v_old_deleted::text, true);
  PERFORM set_config('tests.new_deleted', v_new_deleted::text, true);
  PERFORM set_config('tests.active',      v_active::text,      true);
  PERFORM set_config('tests.orphan',      v_orphan::text,      true);
END; $$;

-- Run the same SQL the pg_cron job runs
DELETE FROM public.profiles
 WHERE status = 'deleted'
   AND deleted_at IS NOT NULL
   AND deleted_at < now() - interval '30 days';

-- ---------------------------------------------------------------------------
-- Test 4: old soft-deleted profile is purged
-- ---------------------------------------------------------------------------
SELECT ok(
  NOT EXISTS(SELECT 1 FROM public.profiles
              WHERE user_id = current_setting('tests.old_deleted')::uuid),
  'profile soft-deleted > 30 days ago is purged'
);

-- ---------------------------------------------------------------------------
-- Test 5: recent soft-delete is preserved
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS(SELECT 1 FROM public.profiles
          WHERE user_id = current_setting('tests.new_deleted')::uuid),
  'profile soft-deleted < 30 days ago is preserved'
);

-- ---------------------------------------------------------------------------
-- Test 6: active profile untouched
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS(SELECT 1 FROM public.profiles
          WHERE user_id = current_setting('tests.active')::uuid),
  'active profile is not affected by purge'
);

-- ---------------------------------------------------------------------------
-- Test 7: status=deleted but deleted_at NULL is preserved
-- (defends against accidental purge of an inconsistent row)
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS(SELECT 1 FROM public.profiles
          WHERE user_id = current_setting('tests.orphan')::uuid),
  'profile with status=deleted but deleted_at NULL is preserved'
);

-- ---------------------------------------------------------------------------
-- Test 8: purge is idempotent — running again deletes nothing further
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_before int; v_after int;
BEGIN
  SELECT count(*) INTO v_before FROM public.profiles;
  DELETE FROM public.profiles
   WHERE status = 'deleted'
     AND deleted_at IS NOT NULL
     AND deleted_at < now() - interval '30 days';
  SELECT count(*) INTO v_after FROM public.profiles;
  PERFORM set_config('tests.before', v_before::text, true);
  PERFORM set_config('tests.after',  v_after::text,  true);
END; $$;

SELECT is(
  current_setting('tests.before'),
  current_setting('tests.after'),
  'purge is idempotent — second run is a no-op'
);

SELECT * FROM finish();
ROLLBACK;
