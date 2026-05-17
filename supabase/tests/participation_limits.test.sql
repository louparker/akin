-- supabase/tests/participation_limits.test.sql
-- pgTAP tests for 0005_participation_limits.sql
-- Every edge case from ARCHITECTURE.md §4 is covered.
--
-- Note: pgTAP assertions must be SELECTed to emit TAP lines.
-- DO blocks use set_config to export values; assertions happen outside.
BEGIN;

SELECT plan(12);

-- ---------------------------------------------------------------------------
-- Setup helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION tests.make_user_full(p_email text)
RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := extensions.uuid_generate_v4();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (v_uid, p_email, 'x', now(), now(), now(), '{}', '{}',
          'authenticated', 'authenticated');
  UPDATE public.profiles SET age_verified_at = now() WHERE user_id = v_uid;
  RETURN v_uid;
END; $$;

-- Create 6 test users
DO $$
DECLARE
  v_op uuid; v_b uuid; v_c uuid;
  v_d  uuid; v_e uuid; v_f uuid;
BEGIN
  v_op := tests.make_user_full('op_lim@akin.test');
  v_b  := tests.make_user_full('b_lim@akin.test');
  v_c  := tests.make_user_full('c_lim@akin.test');
  v_d  := tests.make_user_full('d_lim@akin.test');
  v_e  := tests.make_user_full('e_lim@akin.test');
  v_f  := tests.make_user_full('f_lim@akin.test');
  PERFORM set_config('t.op', v_op::text, true);
  PERFORM set_config('t.b',  v_b::text,  true);
  PERFORM set_config('t.c',  v_c::text,  true);
  PERFORM set_config('t.d',  v_d::text,  true);
  PERFORM set_config('t.e',  v_e::text,  true);
  PERFORM set_config('t.f',  v_f::text,  true);
END; $$;

-- Helper: create a post as a given user
CREATE OR REPLACE FUNCTION tests.make_post(p_author uuid, p_title text DEFAULT 'Test post')
RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_pid uuid;
BEGIN
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (p_author, 'TestUser1', p_title, 'Body content for test', 'vent_space')
  RETURNING id INTO v_pid;
  RETURN v_pid;
END; $$;

-- Helper: add a comment from a given user
CREATE OR REPLACE FUNCTION tests.add_comment(p_post uuid, p_author uuid)
RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_cid uuid;
BEGIN
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (p_post, p_author, 'TestUser1', 'A comment body here')
  RETURNING id INTO v_cid;
  RETURN v_cid;
END; $$;

-- ---------------------------------------------------------------------------
-- Test 1: OP commenting on own post does NOT increment participant_count
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_post uuid;
BEGIN
  v_post := tests.make_post(current_setting('t.op')::uuid, 'OP own comment test');
  PERFORM tests.add_comment(v_post, current_setting('t.op')::uuid);
  PERFORM set_config('t.op_post', v_post::text, true);
END; $$;

SELECT is(
  (SELECT participant_count FROM public.posts WHERE id = current_setting('t.op_post')::uuid),
  1,
  'OP comment does not increment participant_count'
);

-- ---------------------------------------------------------------------------
-- Test 2: OP commenting does NOT increment active_post_count
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_post uuid;
BEGIN
  v_post := tests.make_post(current_setting('t.op')::uuid, 'OP own comment test 2');
  PERFORM tests.add_comment(v_post, current_setting('t.op')::uuid);
END; $$;

SELECT is(
  (SELECT active_post_count FROM public.profiles
   WHERE user_id = current_setting('t.op')::uuid),
  2,  -- 2 posts created, OP comments did not add more
  'OP comment does not increment active_post_count'
);

-- ---------------------------------------------------------------------------
-- Test 3: Three unique commenters admitted → participant_count = 4
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_post uuid;
BEGIN
  v_post := tests.make_post(current_setting('t.op')::uuid, 'Full post test');
  PERFORM tests.add_comment(v_post, current_setting('t.b')::uuid);
  PERFORM tests.add_comment(v_post, current_setting('t.c')::uuid);
  PERFORM tests.add_comment(v_post, current_setting('t.d')::uuid);
  PERFORM set_config('t.full_post', v_post::text, true);
END; $$;

SELECT is(
  (SELECT participant_count FROM public.posts WHERE id = current_setting('t.full_post')::uuid),
  4,
  'three unique commenters raises participant_count to 4'
);

-- ---------------------------------------------------------------------------
-- Test 4: 4th unique commenter (5th person) is rejected with INSUFFICIENT_PARTICIPANT_SLOTS
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  format($q$INSERT INTO public.comments (post_id, author_id, author_identifier, body)
             VALUES (%L, %L, 'EUser1', 'fifth commenter attempt')$q$,
    current_setting('t.full_post')::uuid,
    current_setting('t.e')::uuid),
  'P0001',
  'INSUFFICIENT_PARTICIPANT_SLOTS',
  '4th unique commenter is rejected with INSUFFICIENT_PARTICIPANT_SLOTS'
);

-- ---------------------------------------------------------------------------
-- Test 5: post transitions to is_full=true when participant_count=4
-- ---------------------------------------------------------------------------
SELECT is(
  (SELECT is_full FROM public.posts WHERE id = current_setting('t.full_post')::uuid),
  true,
  'post is_full=true when participant_count=4'
);

-- ---------------------------------------------------------------------------
-- Test 6: repeat commenter (already a participant) does not change counts
-- Use set_config to pass the before/after values out of the DO block.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_before int;
BEGIN
  SELECT participant_count INTO v_before
    FROM public.posts WHERE id = current_setting('t.op_post')::uuid;
  PERFORM tests.add_comment(current_setting('t.op_post')::uuid,
                             current_setting('t.op')::uuid);
  PERFORM set_config('t.test6_before',
    v_before::text, true);
  PERFORM set_config('t.test6_after',
    (SELECT participant_count FROM public.posts
     WHERE id = current_setting('t.op_post')::uuid)::text,
    true);
END; $$;

SELECT is(
  current_setting('t.test6_after')::int,
  current_setting('t.test6_before')::int,
  'repeat OP comment does not change participant_count'
);

-- ---------------------------------------------------------------------------
-- Test 7: user at 3 active posts cannot comment on a 4th non-full post
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_b uuid := current_setting('t.b')::uuid;
  v_p4 uuid;
BEGIN
  -- b was a commenter (incremented to active=1 in test 3).
  -- Reset b to a clean slate.
  UPDATE public.profiles SET active_post_count = 0 WHERE user_id = v_b;
  DELETE FROM public.post_participants WHERE user_id = v_b;

  PERFORM tests.make_post(v_b, 'B post 1');
  PERFORM tests.make_post(v_b, 'B post 2');
  PERFORM tests.make_post(v_b, 'B post 3');
  -- b now has active_post_count = 3

  v_p4 := tests.make_post(current_setting('t.op')::uuid, 'OP post for b overflow');
  PERFORM set_config('t.b_post4', v_p4::text, true);
END; $$;

SELECT throws_ok(
  format($q$INSERT INTO public.comments (post_id, author_id, author_identifier, body)
             VALUES (%L, %L, 'BUser1', 'overflow comment')$q$,
    current_setting('t.b_post4')::uuid,
    current_setting('t.b')::uuid),
  'P0003',
  'USER_ACTIVE_LIMIT_REACHED',
  'user at 3 active posts cannot comment on 4th non-full post'
);

-- ---------------------------------------------------------------------------
-- Test 8: when a post fills, all participants get active_post_count decremented
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_post       uuid;
  v_op_before  int;
  v_c_before   int;
BEGIN
  -- Reset op, b, c, d to clean state: prior tests left them with accumulated counts
  UPDATE public.profiles SET active_post_count = 0
    WHERE user_id IN (
      current_setting('t.op')::uuid,
      current_setting('t.b')::uuid,
      current_setting('t.c')::uuid,
      current_setting('t.d')::uuid
    );
  DELETE FROM public.post_participants
    WHERE user_id IN (
      current_setting('t.op')::uuid,
      current_setting('t.b')::uuid,
      current_setting('t.c')::uuid,
      current_setting('t.d')::uuid
    );

  SELECT active_post_count INTO v_op_before
    FROM public.profiles WHERE user_id = current_setting('t.op')::uuid;

  v_post := tests.make_post(current_setting('t.op')::uuid, 'Fill test post');
  -- op count +1 on post creation

  PERFORM tests.add_comment(v_post, current_setting('t.b')::uuid);
  PERFORM tests.add_comment(v_post, current_setting('t.c')::uuid);
  -- post at participant_count=3

  SELECT active_post_count INTO v_c_before
    FROM public.profiles WHERE user_id = current_setting('t.c')::uuid;

  -- 4th participant fills it → decrement_active_on_full fires
  PERFORM tests.add_comment(v_post, current_setting('t.d')::uuid);

  -- OP: +1 on creation, -1 on fill → net 0 (back to before)
  PERFORM set_config('t.op_after_fill',
    (SELECT active_post_count FROM public.profiles
     WHERE user_id = current_setting('t.op')::uuid)::text, true);
  PERFORM set_config('t.op_before_fill', v_op_before::text, true);
  -- c: was incremented by comment, then decremented on fill
  PERFORM set_config('t.c_after_fill',
    (SELECT active_post_count FROM public.profiles
     WHERE user_id = current_setting('t.c')::uuid)::text, true);
  PERFORM set_config('t.c_before_fill', v_c_before::text, true);
END; $$;

SELECT is(
  current_setting('t.op_after_fill')::int,
  current_setting('t.op_before_fill')::int,
  'OP active_post_count is back to pre-post level after post fills'
);

SELECT is(
  current_setting('t.c_after_fill')::int,
  current_setting('t.c_before_fill')::int - 1,
  'commenter c active_post_count decremented when post fills'
);

-- ---------------------------------------------------------------------------
-- Test 9 (plan slot 10): creating a 4th post while active_post_count=3 is rejected
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_f uuid := current_setting('t.f')::uuid;
BEGIN
  UPDATE public.profiles SET active_post_count = 0 WHERE user_id = v_f;
  DELETE FROM public.post_participants WHERE user_id = v_f;
  PERFORM tests.make_post(v_f, 'F post 1');
  PERFORM tests.make_post(v_f, 'F post 2');
  PERFORM tests.make_post(v_f, 'F post 3');
END; $$;

SELECT throws_ok(
  format($q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
             VALUES (%L, 'FUser1', 'F post 4 - rejected', 'Body here', 'vent_space')$q$,
    current_setting('t.f')::uuid),
  'P0003',
  'USER_ACTIVE_LIMIT_REACHED',
  'creating 4th post while active_post_count=3 is rejected'
);

-- ---------------------------------------------------------------------------
-- Test 11: soft-deleting a comment does NOT decrement active/participant counts
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_post    uuid;
  v_comment uuid;
  v_e_count_before int;
BEGIN
  v_post := tests.make_post(current_setting('t.op')::uuid, 'Soft delete comment test');
  v_comment := tests.add_comment(v_post, current_setting('t.e')::uuid);

  SELECT active_post_count INTO v_e_count_before
    FROM public.profiles WHERE user_id = current_setting('t.e')::uuid;

  UPDATE public.comments SET status = 'deleted' WHERE id = v_comment;

  PERFORM set_config('t.e_count_before', v_e_count_before::text, true);
  PERFORM set_config('t.e_count_after',
    (SELECT active_post_count FROM public.profiles
     WHERE user_id = current_setting('t.e')::uuid)::text, true);
  PERFORM set_config('t.test11_pcount',
    (SELECT participant_count FROM public.posts WHERE id = v_post)::text, true);
END; $$;

SELECT is(
  current_setting('t.e_count_after')::int,
  current_setting('t.e_count_before')::int,
  'soft-deleting a comment does not decrement active_post_count'
);

SELECT ok(
  current_setting('t.test11_pcount')::int >= 2,
  'soft-deleting a comment does not decrement participant_count'
);

SELECT * FROM finish();
ROLLBACK;
