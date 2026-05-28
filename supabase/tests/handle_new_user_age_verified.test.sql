-- supabase/tests/handle_new_user_age_verified.test.sql
-- pgTAP tests for 0016_fix_handle_new_user_age_verified.sql
--
-- Regression test for the silent RLS rejection bug: posts.INSERT requires
-- profiles.age_verified_at IS NOT NULL, but the original handle_new_user
-- (0001) created profiles with age_verified_at = NULL even when signUp()
-- passed it in raw_user_meta_data. Result: every post INSERT was rejected
-- by RLS until 0016 propagated the metadata into the profile row.
--
-- Asserts:
--   1. Inserting an auth.users row with age_verified_at in raw_user_meta_data
--      produces a profile with age_verified_at populated.
--   2. Inserting an auth.users row WITHOUT age_verified_at in metadata
--      produces a profile with age_verified_at = NULL.
--   3. The trigger preserves prior behavior — anonymous_identifier is still
--      set to pending_<8 chars>.

BEGIN;

SELECT plan(5);

-- ---------------------------------------------------------------------------
-- Test 1: metadata with age_verified_at → profile row has it set
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_uid uuid := extensions.uuid_generate_v4();
  v_ts  timestamptz := '2026-01-15 10:00:00+00';
BEGIN
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role
  )
  VALUES (
    v_uid, 'with_age@handle.test', 'x', now(),
    now(), now(), '{}',
    jsonb_build_object('age_verified_at', v_ts::text),
    'authenticated', 'authenticated'
  );
  PERFORM set_config('tests.with_uid', v_uid::text, true);
  PERFORM set_config('tests.with_ts',  v_ts::text, true);
END; $$;

SELECT ok(
  (SELECT age_verified_at FROM public.profiles
    WHERE user_id = current_setting('tests.with_uid')::uuid) IS NOT NULL,
  'age_verified_at from raw_user_meta_data is propagated into profile'
);

SELECT is(
  (SELECT age_verified_at FROM public.profiles
    WHERE user_id = current_setting('tests.with_uid')::uuid),
  current_setting('tests.with_ts')::timestamptz,
  'age_verified_at value matches what was stored in metadata'
);

-- ---------------------------------------------------------------------------
-- Test 2: metadata without age_verified_at → profile has NULL
-- (this is the pre-age-gate-check path; legit case for service-only accounts)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_uid uuid := extensions.uuid_generate_v4();
BEGIN
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role
  )
  VALUES (
    v_uid, 'no_age@handle.test', 'x', now(),
    now(), now(), '{}', '{}',
    'authenticated', 'authenticated'
  );
  PERFORM set_config('tests.no_uid', v_uid::text, true);
END; $$;

SELECT ok(
  (SELECT age_verified_at FROM public.profiles
    WHERE user_id = current_setting('tests.no_uid')::uuid) IS NULL,
  'profile.age_verified_at is NULL when metadata omits it'
);

-- ---------------------------------------------------------------------------
-- Test 3: placeholder anonymous_identifier is still set
-- (regression guard — fixing 0016 must not break the 0001 contract)
-- ---------------------------------------------------------------------------
SELECT ok(
  (SELECT anonymous_identifier FROM public.profiles
    WHERE user_id = current_setting('tests.with_uid')::uuid) LIKE 'pending_%',
  'anonymous_identifier still defaults to pending_<...> for profiles with age set'
);

SELECT ok(
  (SELECT anonymous_identifier FROM public.profiles
    WHERE user_id = current_setting('tests.no_uid')::uuid) LIKE 'pending_%',
  'anonymous_identifier still defaults to pending_<...> for profiles without age'
);

SELECT * FROM finish();
ROLLBACK;
