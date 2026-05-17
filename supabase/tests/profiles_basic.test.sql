-- supabase/tests/profiles_basic.test.sql
-- pgTAP tests for 0001_create_profiles.sql
--
-- Note: pgTAP functions must be SELECTed (not PERFORMed) to emit TAP lines.
-- DO blocks that need assertions use set_config to pass values out.
BEGIN;

SELECT plan(9);

-- ---------------------------------------------------------------------------
-- Helper: create a test user and return their id
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
-- Test 1: inserting into auth.users automatically creates a profiles row
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_uid uuid;
BEGIN
  v_uid := tests.create_user_with_profile('test_trigger@akin.test');
  PERFORM set_config('tests.trigger_uid', v_uid::text, true);
END; $$;

SELECT ok(
  EXISTS(SELECT 1 FROM public.profiles
         WHERE user_id = current_setting('tests.trigger_uid')::uuid),
  'auth.users insert creates a profiles row'
);

SELECT ok(
  (SELECT anonymous_identifier FROM public.profiles
   WHERE user_id = current_setting('tests.trigger_uid')::uuid) LIKE 'pending_%',
  'placeholder identifier starts with pending_'
);

-- ---------------------------------------------------------------------------
-- Test 2: active profile is publicly readable
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_alice uuid; v_bob uuid;
BEGIN
  v_alice := tests.create_user_with_profile('alice@akin_prof.test');
  v_bob   := tests.create_user_with_profile('bob@akin_prof.test');
  PERFORM set_config('tests.alice', v_alice::text, true);
  PERFORM set_config('tests.bob',   v_bob::text,   true);
END; $$;

SELECT ok(
  EXISTS(SELECT 1 FROM public.profiles
         WHERE user_id = current_setting('tests.bob')::uuid),
  'active profile is publicly readable'
);

-- ---------------------------------------------------------------------------
-- Test 3: owner can read own profile row
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS(SELECT 1 FROM public.profiles
         WHERE user_id = current_setting('tests.alice')::uuid),
  'owner can read own profile'
);

-- ---------------------------------------------------------------------------
-- Test 4: direct update of active_post_count is rejected for authenticated clients
-- Guard trigger allows postgres (internal) but blocks 'authenticated'.
-- Set JWT claim so the row is visible via RLS, then switch role.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.alice'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format(
    $q$UPDATE public.profiles SET active_post_count = 1 WHERE user_id = %L$q$,
    current_setting('tests.alice')::uuid
  ),
  null,
  'direct update of active_post_count is rejected'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 5: active_post_count CHECK rejects value < 0
-- (direct postgres-level UPDATE to test the CHECK constraint)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_uid uuid;
BEGIN
  v_uid := tests.create_user_with_profile('bad_count@akin_prof.test');
  PERFORM set_config('tests.bad_count_uid', v_uid::text, true);
END; $$;

SELECT throws_ok(
  format(
    $q$UPDATE public.profiles SET active_post_count = -1 WHERE user_id = %L$q$,
    current_setting('tests.bad_count_uid')::uuid
  ),
  null,
  'active_post_count < 0 is rejected by check constraint'
);

-- ---------------------------------------------------------------------------
-- Test 6: active_post_count CHECK rejects value > 3
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  format(
    $q$UPDATE public.profiles SET active_post_count = 4 WHERE user_id = %L$q$,
    current_setting('tests.alice')::uuid
  ),
  null,
  'active_post_count > 3 is rejected by check constraint'
);

-- ---------------------------------------------------------------------------
-- Test 7: anonymous_identifier is unique across profiles
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_uid uuid;
BEGIN
  v_uid := tests.create_user_with_profile('dup_id@akin_prof.test');
  PERFORM set_config('tests.dup_id_uid', v_uid::text, true);
END; $$;

SELECT throws_ok(
  format(
    $q$UPDATE public.profiles SET anonymous_identifier = %L WHERE user_id = %L$q$,
    (SELECT anonymous_identifier FROM public.profiles
     WHERE user_id = current_setting('tests.alice')::uuid),
    current_setting('tests.dup_id_uid')::uuid
  ),
  null,
  'duplicate anonymous_identifier is rejected'
);

-- ---------------------------------------------------------------------------
-- Test 8: cascading delete — deleting auth.users removes the profile
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_uid uuid;
BEGIN
  v_uid := tests.create_user_with_profile('cascade_delete@akin_prof.test');
  PERFORM set_config('tests.cascade_uid', v_uid::text, true);
  DELETE FROM auth.users WHERE id = v_uid;
END; $$;

SELECT ok(
  NOT EXISTS(SELECT 1 FROM public.profiles
             WHERE user_id = current_setting('tests.cascade_uid')::uuid),
  'deleting auth.users cascades to profiles'
);

SELECT * FROM finish();
ROLLBACK;
