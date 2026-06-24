-- supabase/tests/0028_free_slot_on_comment_delete.test.sql
-- pgTAP for 0028_free_slot_on_comment_delete.sql.
--
-- "Leave the conversation": when a non-OP participant soft-deletes their LAST
-- active comment on a still-open (not-full) post, they vacate the seat
-- (participant_count--) and get their active slot back (active_post_count--),
-- and a new person can take the freed seat. Deleting one of several comments
-- does nothing; full posts are left untouched (they already returned every
-- slot when they filled, so un-filling would double-count).
BEGIN;

SELECT plan(12);

CREATE OR REPLACE FUNCTION tests.make_user_cdel(p_email text)
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

DO $$
DECLARE v_op uuid; v_b uuid; v_c uuid; v_f1 uuid; v_f2 uuid; v_f3 uuid;
BEGIN
  v_op := tests.make_user_cdel('op_cdel@akin.test');
  v_b  := tests.make_user_cdel('b_cdel@akin.test');
  v_c  := tests.make_user_cdel('c_cdel@akin.test');
  v_f1 := tests.make_user_cdel('f1_cdel@akin.test');
  v_f2 := tests.make_user_cdel('f2_cdel@akin.test');
  v_f3 := tests.make_user_cdel('f3_cdel@akin.test');
  PERFORM set_config('c.op', v_op::text, true);
  PERFORM set_config('c.b',  v_b::text,  true);
  PERFORM set_config('c.c',  v_c::text,  true);
  PERFORM set_config('c.f1', v_f1::text, true);
  PERFORM set_config('c.f2', v_f2::text, true);
  PERFORM set_config('c.f3', v_f3::text, true);
END; $$;

-- ---------------------------------------------------------------------------
-- Test 1: B soft-deletes their ONLY comment on a not-full post → leaves it.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_post uuid; v_comment uuid;
BEGIN
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (current_setting('c.op')::uuid, 'OpC1', 'Leave me', 'Body content here', 'vent_space')
  RETURNING id INTO v_post;

  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (v_post, current_setting('c.b')::uuid, 'BC1', 'my only comment')
  RETURNING id INTO v_comment;

  PERFORM set_config('c.t1_active_before',
    (SELECT active_post_count FROM public.profiles
      WHERE user_id = current_setting('c.b')::uuid)::text, true);

  UPDATE public.comments SET status = 'deleted' WHERE id = v_comment;

  PERFORM set_config('c.t1_active_after',
    (SELECT active_post_count FROM public.profiles
      WHERE user_id = current_setting('c.b')::uuid)::text, true);
  PERFORM set_config('c.t1_pcount',
    (SELECT participant_count FROM public.posts WHERE id = v_post)::text, true);
  PERFORM set_config('c.t1_still',
    (EXISTS (SELECT 1 FROM public.post_participants
       WHERE post_id = v_post AND user_id = current_setting('c.b')::uuid))::text, true);
  PERFORM set_config('c.t1_post', v_post::text, true);
END; $$;

SELECT is(current_setting('c.t1_active_before')::int, 1,
  'commenter is active in 1 post after commenting');
SELECT is(current_setting('c.t1_active_after')::int, 0,
  'deleting last comment on a not-full post frees the commenter active slot');
SELECT is(current_setting('c.t1_pcount')::int, 1,
  'deleting last comment vacates the seat (participant_count 2 -> 1)');
SELECT is(current_setting('c.t1_still')::boolean, false,
  'commenter is no longer a participant after leaving');

-- ---------------------------------------------------------------------------
-- Test 2: B re-comments on the same (still not-full) post → re-admitted.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_post uuid;
BEGIN
  v_post := current_setting('c.t1_post')::uuid;
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (v_post, current_setting('c.b')::uuid, 'BC1', 'back again');

  PERFORM set_config('c.t2_active',
    (SELECT active_post_count FROM public.profiles
      WHERE user_id = current_setting('c.b')::uuid)::text, true);
  PERFORM set_config('c.t2_pcount',
    (SELECT participant_count FROM public.posts WHERE id = v_post)::text, true);
END; $$;

SELECT is(current_setting('c.t2_active')::int, 1,
  'commenter can re-join after leaving (active back to 1)');
SELECT is(current_setting('c.t2_pcount')::int, 2,
  'seat re-occupied on re-join (participant_count back to 2)');

-- ---------------------------------------------------------------------------
-- Test 3: deleting one of several comments does NOT leave the conversation.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_post uuid; v_c1 uuid;
BEGIN
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (current_setting('c.op')::uuid, 'OpC2', 'Two comments', 'Body content here', 'good_vibes')
  RETURNING id INTO v_post;

  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (v_post, current_setting('c.c')::uuid, 'CC1', 'first')
  RETURNING id INTO v_c1;
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (v_post, current_setting('c.c')::uuid, 'CC1', 'second');

  UPDATE public.comments SET status = 'deleted' WHERE id = v_c1;

  PERFORM set_config('c.t3_active',
    (SELECT active_post_count FROM public.profiles
      WHERE user_id = current_setting('c.c')::uuid)::text, true);
  PERFORM set_config('c.t3_pcount',
    (SELECT participant_count FROM public.posts WHERE id = v_post)::text, true);
  PERFORM set_config('c.t3_still',
    (EXISTS (SELECT 1 FROM public.post_participants
       WHERE post_id = v_post AND user_id = current_setting('c.c')::uuid))::text, true);
END; $$;

SELECT is(current_setting('c.t3_active')::int, 1,
  'deleting one of several comments keeps the commenter active');
SELECT is(current_setting('c.t3_pcount')::int, 2,
  'deleting one of several comments keeps the seat occupied');
SELECT is(current_setting('c.t3_still')::boolean, true,
  'commenter remains a participant while they still have an active comment');

-- ---------------------------------------------------------------------------
-- Test 4: deleting a comment on a FULL post is a no-op (scoped to non-full).
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_post uuid; v_f1com uuid;
BEGIN
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (current_setting('c.op')::uuid, 'OpC3', 'Full post', 'Body content here', 'advice_needed')
  RETURNING id INTO v_post;

  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (v_post, current_setting('c.f1')::uuid, 'F1C', 'f1 comment')
  RETURNING id INTO v_f1com;
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (v_post, current_setting('c.f2')::uuid, 'F2C', 'f2 comment');
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (v_post, current_setting('c.f3')::uuid, 'F3C', 'f3 comment');
  -- post is now full (4 participants); decrement_active_on_full returned all slots.

  PERFORM set_config('c.t4_active_before',
    (SELECT active_post_count FROM public.profiles
      WHERE user_id = current_setting('c.f1')::uuid)::text, true);

  UPDATE public.comments SET status = 'deleted' WHERE id = v_f1com;

  PERFORM set_config('c.t4_active_after',
    (SELECT active_post_count FROM public.profiles
      WHERE user_id = current_setting('c.f1')::uuid)::text, true);
  PERFORM set_config('c.t4_pcount',
    (SELECT participant_count FROM public.posts WHERE id = v_post)::text, true);
END; $$;

SELECT is(current_setting('c.t4_active_before')::int, 0,
  'on a full post every participant slot was already returned');
SELECT is(current_setting('c.t4_active_after')::int, 0,
  'deleting a comment on a full post does not push active_post_count negative');
SELECT is(current_setting('c.t4_pcount')::int, 4,
  'deleting a comment on a full post does not un-fill it');

SELECT * FROM finish();
ROLLBACK;
