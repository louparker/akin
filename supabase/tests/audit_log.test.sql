-- supabase/tests/audit_log.test.sql
BEGIN;
SELECT plan(4);

CREATE OR REPLACE FUNCTION tests.alu(p_email text, p_mod boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid;
BEGIN
  v := extensions.uuid_generate_v4();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (v, p_email, 'x', now(), now(), now(), '{}', '{}',
          'authenticated', 'authenticated');
  IF p_mod THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v, 'moderator');
  END IF;
  RETURN v;
END; $$;

DO $$
DECLARE vm uuid; vn uuid;
BEGIN
  vm := tests.alu('audit_mod@akin.test',    true);
  vn := tests.alu('audit_normal@akin.test', false);
  PERFORM set_config('t.mod',    vm::text, true);
  PERFORM set_config('t.normal', vn::text, true);
END; $$;

-- Test 1: log_audit() writes a row with the correct shape
SELECT public.log_audit(
  current_setting('t.mod')::uuid,
  'test.action',
  'post',
  extensions.uuid_generate_v4(),
  '{"reason": "test"}'::jsonb
);

SELECT ok(
  EXISTS(SELECT 1 FROM public.audit_log WHERE action = 'test.action'),
  'log_audit() inserts an audit row'
);

-- Test 2: moderator can SELECT from audit_log
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log WHERE action = 'test.action') >= 1,
  'audit_log row is present and readable'
);

-- Test 3: no DELETE policy on audit_log
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE tablename = 'audit_log' AND cmd = 'DELETE'),
  0,
  'no DELETE policy on audit_log (append-only)'
);

-- Test 4: no UPDATE policy on audit_log
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE tablename = 'audit_log' AND cmd = 'UPDATE'),
  0,
  'no UPDATE policy on audit_log (append-only)'
);

SELECT * FROM finish();
ROLLBACK;
