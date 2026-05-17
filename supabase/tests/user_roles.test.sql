-- supabase/tests/user_roles.test.sql
BEGIN;
SELECT plan(3);

CREATE OR REPLACE FUNCTION tests.rlu(p_email text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid;
BEGIN
  v := extensions.uuid_generate_v4();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (v, p_email, 'x', now(), now(), now(), '{}', '{}',
          'authenticated', 'authenticated');
  RETURN v;
END; $$;

DO $$
DECLARE vm uuid; vn uuid;
BEGIN
  vm := tests.rlu('mod@akin.test');
  vn := tests.rlu('normal@akin.test');
  -- Grant moderator role (service-role operation)
  INSERT INTO public.user_roles (user_id, role) VALUES (vm, 'moderator');
  PERFORM set_config('t.mod',    vm::text, true);
  PERFORM set_config('t.normal', vn::text, true);
END; $$;

-- Test 1: is_moderator() returns true for moderator role.
-- is_moderator() reads auth.uid(), so we must set the JWT claim to the mod's UUID.
SELECT set_config('request.jwt.claim.sub', current_setting('t.mod'), true);
SET LOCAL ROLE authenticated;

SELECT ok(
  public.is_moderator(),
  'is_moderator() returns true for moderator'
);

RESET ROLE;

-- Test 2: is_moderator() returns false for regular user
SELECT set_config('request.jwt.claim.sub', current_setting('t.normal'), true);
SET LOCAL ROLE authenticated;

SELECT ok(
  NOT public.is_moderator(),
  'is_moderator() returns false for non-moderator'
);

RESET ROLE;

-- Test 3: no INSERT policy means regular client cannot insert into user_roles
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE tablename = 'user_roles'
      AND cmd = 'INSERT'),
  0,
  'no INSERT policy on user_roles (only service_role can grant roles)'
);

SELECT * FROM finish();
ROLLBACK;
