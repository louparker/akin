-- supabase/tests/onboarded_at.test.sql
-- pgTAP tests for 0013_add_onboarded_at.sql
--
-- Asserts:
--   1. profiles.onboarded_at exists as timestamptz, nullable.
--   2. New profiles default to onboarded_at IS NULL.
--   3. Owner (authenticated, request.jwt.claim.sub = user_id) can set their own onboarded_at.
--   4. The allowed-columns guard trigger from 0001 does not block onboarded_at writes.

BEGIN;

SELECT plan(5);

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
-- Test 1 + 2: column exists, correct type, nullable
-- ---------------------------------------------------------------------------
SELECT has_column('public', 'profiles', 'onboarded_at',
  'profiles.onboarded_at column exists');

SELECT col_type_is('public', 'profiles', 'onboarded_at', 'timestamp with time zone',
  'onboarded_at is timestamptz');

-- ---------------------------------------------------------------------------
-- Test 3: new profiles default to NULL
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_uid uuid;
BEGIN
  v_uid := tests.create_user_with_profile('newuser@onboarded.test');
  PERFORM set_config('tests.new_uid', v_uid::text, true);
END; $$;

SELECT ok(
  (SELECT onboarded_at FROM public.profiles
    WHERE user_id = current_setting('tests.new_uid')::uuid) IS NULL,
  'newly created profile has onboarded_at = NULL'
);

-- ---------------------------------------------------------------------------
-- Test 4: owner can set onboarded_at (the guard trigger permits this column)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_uid uuid;
BEGIN
  v_uid := tests.create_user_with_profile('owner@onboarded.test');
  PERFORM set_config('tests.owner_uid', v_uid::text, true);
END; $$;

SELECT set_config('request.jwt.claim.sub', current_setting('tests.owner_uid'), true);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  format(
    $q$UPDATE public.profiles SET onboarded_at = now() WHERE user_id = %L$q$,
    current_setting('tests.owner_uid')::uuid
  ),
  'owner can set their own onboarded_at'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 5: value persists after the write
-- ---------------------------------------------------------------------------
SELECT ok(
  (SELECT onboarded_at FROM public.profiles
    WHERE user_id = current_setting('tests.owner_uid')::uuid) IS NOT NULL,
  'onboarded_at is non-NULL after owner write'
);

SELECT * FROM finish();
ROLLBACK;
