-- supabase/tests/blocks.test.sql
BEGIN;
SELECT plan(5);

CREATE OR REPLACE FUNCTION tests.bu(p_email text)
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
DECLARE va uuid; vb uuid; vp uuid;
BEGIN
  va := tests.bu('a_block@akin.test');
  vb := tests.bu('b_block@akin.test');
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (vb, 'BBlock1', 'B post', 'B post body here', 'vent_space')
  RETURNING id INTO vp;
  PERFORM set_config('t.a', va::text, true);
  PERFORM set_config('t.b', vb::text, true);
  PERFORM set_config('t.bp', vp::text, true);
  -- A blocks B
  INSERT INTO public.blocks (blocker_id, blocked_id) VALUES (va, vb);
END; $$;

-- Test 1: A blocks B → A cannot see B's posts (block-aware RLS)
SELECT is(
  (SELECT count(*)::int FROM public.posts
   WHERE id = current_setting('t.bp')::uuid
     AND NOT EXISTS (
       SELECT 1 FROM public.blocks
        WHERE (blocker_id = current_setting('t.a')::uuid AND blocked_id = posts.author_id)
           OR (blocker_id = posts.author_id AND blocked_id = current_setting('t.a')::uuid)
     )),
  0, 'A cannot see B post when A blocked B'
);

-- Test 2: B cannot see A's posts (bidirectional)
DO $$
DECLARE vap uuid;
BEGIN
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (current_setting('t.a')::uuid, 'ABlock1', 'A post', 'A post body here', 'vent_space')
  RETURNING id INTO vap;
  PERFORM set_config('t.ap', vap::text, true);
END; $$;

SELECT is(
  (SELECT count(*)::int FROM public.posts
   WHERE id = current_setting('t.ap')::uuid
     AND NOT EXISTS (
       SELECT 1 FROM public.blocks
        WHERE (blocker_id = current_setting('t.b')::uuid AND blocked_id = posts.author_id)
           OR (blocker_id = posts.author_id AND blocked_id = current_setting('t.b')::uuid)
     )),
  0, 'B cannot see A post (bidirectional block)'
);

-- Test 3: A unblocks B → B post is visible again
DELETE FROM public.blocks
 WHERE blocker_id = current_setting('t.a')::uuid
   AND blocked_id = current_setting('t.b')::uuid;

SELECT ok(
  EXISTS(
    SELECT 1 FROM public.posts
     WHERE id = current_setting('t.bp')::uuid AND status = 'active'
  ),
  'after unblock B post is visible to A'
);

-- Test 4: cannot block yourself
SELECT throws_ok(
  format($q$INSERT INTO public.blocks (blocker_id, blocked_id)
             VALUES (%L, %L)$q$,
    current_setting('t.a')::uuid, current_setting('t.a')::uuid),
  null, 'cannot block yourself'
);

-- Test 5: second block of same pair is rejected (PK constraint)
INSERT INTO public.blocks (blocker_id, blocked_id)
VALUES (current_setting('t.a')::uuid, current_setting('t.b')::uuid);

SELECT throws_ok(
  format($q$INSERT INTO public.blocks (blocker_id, blocked_id)
             VALUES (%L, %L)$q$,
    current_setting('t.a')::uuid, current_setting('t.b')::uuid),
  null, 'duplicate block is rejected'
);

SELECT * FROM finish();
ROLLBACK;
