-- supabase/tests/profile_status_deleted.test.sql
-- pgTAP tests for 0014_add_deleted_at_pgcron.sql
--
-- 0014 only adds the 'deleted' enum value to profile_status. We assert:
--   1. The enum value exists.
--   2. A profile can be transitioned to 'deleted' (precondition for 0015 purge).

BEGIN;

SELECT plan(2);

-- ---------------------------------------------------------------------------
-- Test 1: 'deleted' is a valid value on profile_status
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS(
    SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname = 'profile_status'
       AND e.enumlabel = 'deleted'
  ),
  $$'deleted' value exists on profile_status enum$$
);

-- ---------------------------------------------------------------------------
-- Test 2: a profile row accepts status='deleted'
-- (postgres-level UPDATE — RLS / app-level transition rules tested elsewhere)
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

DO $$
DECLARE v_uid uuid;
BEGIN
  v_uid := tests.create_user_with_profile('todelete@status.test');
  UPDATE public.profiles SET status = 'deleted' WHERE user_id = v_uid;
  PERFORM set_config('tests.del_uid', v_uid::text, true);
END; $$;

SELECT is(
  (SELECT status::text FROM public.profiles
    WHERE user_id = current_setting('tests.del_uid')::uuid),
  'deleted',
  'profile.status accepts the deleted enum value'
);

SELECT * FROM finish();
ROLLBACK;
