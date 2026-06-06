-- supabase/tests/is_email_confirmed.test.sql
-- pgTAP for 0018_fix_posts_comments_rls_auth_users.sql
--
-- Regression guards for the "permission denied for table users" bug:
--   1. is_email_confirmed() exists and is callable by the authenticated role.
--   2. It returns true for confirmed users, false otherwise.
--   3. A confirmed + age-verified user can INSERT into posts AS the
--      authenticated role (the path that was broken).
--   4. A confirmed + age-verified user can INSERT into comments AS the
--      authenticated role.
--
-- Note: pgTAP normally runs as the postgres superuser which bypasses RLS.
-- We deliberately switch to the authenticated role here so the policy is
-- evaluated end-to-end exactly as the client would experience it.

BEGIN;

SELECT plan(6);

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.make_confirmed_user(p_email text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := extensions.uuid_generate_v4();
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role
  )
  VALUES (
    v_uid, p_email, 'x',
    now(),                                  -- confirmed
    now(), now(), '{}',
    jsonb_build_object('age_verified_at', now()::text),
    'authenticated', 'authenticated'
  );
  RETURN v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION tests.make_unconfirmed_user(p_email text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := extensions.uuid_generate_v4();
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role
  )
  VALUES (
    v_uid, p_email, 'x',
    NULL,                                   -- not confirmed
    now(), now(), '{}',
    jsonb_build_object('age_verified_at', now()::text),
    'authenticated', 'authenticated'
  );
  RETURN v_uid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Test 1: function exists
-- ---------------------------------------------------------------------------
SELECT has_function('public', 'is_email_confirmed',
  'public.is_email_confirmed() exists');

-- ---------------------------------------------------------------------------
-- Seed: a confirmed user and an unconfirmed user
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_yes uuid; v_no uuid;
BEGIN
  v_yes := tests.make_confirmed_user('confirmed@isemail.test');
  v_no  := tests.make_unconfirmed_user('unconfirmed@isemail.test');
  PERFORM set_config('tests.yes', v_yes::text, true);
  PERFORM set_config('tests.no',  v_no::text,  true);
END; $$;

-- ---------------------------------------------------------------------------
-- Test 2: returns true for confirmed user
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.yes'), true);
SET LOCAL ROLE authenticated;

SELECT is(
  public.is_email_confirmed(),
  true,
  'is_email_confirmed() is true for a confirmed user'
);

-- ---------------------------------------------------------------------------
-- Test 3: post INSERT succeeds as authenticated for a confirmed + verified user
--          (regression for the 42501 permission-denied bug)
-- ---------------------------------------------------------------------------
SELECT lives_ok(
  format(
    $q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
       VALUES (%L::uuid,
               (SELECT anonymous_identifier FROM public.profiles WHERE user_id = %L::uuid),
               'hello', 'world', 'vent_space')$q$,
    current_setting('tests.yes')::uuid,
    current_setting('tests.yes')::uuid
  ),
  'authenticated confirmed user can INSERT into posts (no permission denied)'
);

-- ---------------------------------------------------------------------------
-- Test 4: comment INSERT succeeds as authenticated for confirmed + verified user
-- ---------------------------------------------------------------------------
SELECT lives_ok(
  format(
    $q$INSERT INTO public.comments (post_id, author_id, author_identifier, body)
       SELECT id, %L::uuid,
              (SELECT anonymous_identifier FROM public.profiles WHERE user_id = %L::uuid),
              'first reply'
         FROM public.posts
        WHERE author_id = %L::uuid
        LIMIT 1$q$,
    current_setting('tests.yes')::uuid,
    current_setting('tests.yes')::uuid,
    current_setting('tests.yes')::uuid
  ),
  'authenticated confirmed user can INSERT into comments (no permission denied)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 5: unconfirmed user — is_email_confirmed() returns false
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.no'), true);
SET LOCAL ROLE authenticated;

SELECT is(
  public.is_email_confirmed(),
  false,
  'is_email_confirmed() is false for an unconfirmed user'
);

-- ---------------------------------------------------------------------------
-- Test 6: unconfirmed user cannot INSERT into posts
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  format(
    $q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
       VALUES (%L::uuid,
               (SELECT anonymous_identifier FROM public.profiles WHERE user_id = %L::uuid),
               'should fail', 'body', 'vent_space')$q$,
    current_setting('tests.no')::uuid,
    current_setting('tests.no')::uuid
  ),
  NULL, NULL,
  'unconfirmed user is rejected when attempting to INSERT a post'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
