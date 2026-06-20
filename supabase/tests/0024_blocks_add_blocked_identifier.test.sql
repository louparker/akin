-- supabase/tests/0024_blocks_add_blocked_identifier.test.sql
-- Verifies the blocked_identifier trigger and NOT NULL constraint.
BEGIN;
SELECT plan(3);

CREATE OR REPLACE FUNCTION tests.bu_bi(p_email text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid;
BEGIN
  v := extensions.uuid_generate_v4();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (v, p_email, 'x', now(), now(), now(), '{}', '{}',
          'authenticated', 'authenticated');
  UPDATE public.profiles SET age_verified_at = now() WHERE user_id = v;
  RETURN v;
END; $$;

DO $$
DECLARE va uuid; vb uuid;
BEGIN
  va := tests.bu_bi('blocker_bi@akin.test');
  vb := tests.bu_bi('blocked_bi@akin.test');
  PERFORM set_config('t.va', va::text, true);
  PERFORM set_config('t.vb', vb::text, true);
END; $$;

-- Test 1: trigger auto-populates blocked_identifier on INSERT (no explicit value).
INSERT INTO public.blocks (blocker_id, blocked_id)
VALUES (current_setting('t.va')::uuid, current_setting('t.vb')::uuid);

SELECT is(
  (SELECT blocked_identifier FROM public.blocks
    WHERE blocker_id = current_setting('t.va')::uuid
      AND blocked_id = current_setting('t.vb')::uuid),
  (SELECT anonymous_identifier FROM public.profiles
    WHERE user_id = current_setting('t.vb')::uuid),
  'trigger sets blocked_identifier from profiles on INSERT'
);

-- Test 2: explicit blocked_identifier is preserved (not overwritten by trigger).
DO $$
DECLARE vc uuid; vd uuid;
BEGIN
  vc := tests.bu_bi('blocker_bi2@akin.test');
  vd := tests.bu_bi('blocked_bi2@akin.test');
  INSERT INTO public.blocks (blocker_id, blocked_id, blocked_identifier)
  VALUES (vc, vd, 'ExplicitAlias99');
  PERFORM set_config('t.vc', vc::text, true);
END; $$;

SELECT is(
  (SELECT blocked_identifier FROM public.blocks
    WHERE blocker_id = current_setting('t.vc')::uuid),
  'ExplicitAlias99',
  'explicit blocked_identifier is not overwritten by trigger'
);

-- Test 3: blocked_identifier NOT NULL — insert without trigger coverage fails.
SELECT throws_ok(
  $$UPDATE public.blocks SET blocked_identifier = NULL
      WHERE blocker_id = current_setting('t.va')::uuid$$,
  null,
  'blocked_identifier cannot be set to NULL'
);

SELECT * FROM finish();
ROLLBACK;
