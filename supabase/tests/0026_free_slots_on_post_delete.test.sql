-- supabase/tests/0026_free_slots_on_post_delete.test.sql
-- pgTAP for 0026_free_slots_on_post_delete.sql.
--
-- Soft-deleting a still-active (not-full) post frees its participants' active
-- slots. A full post already returned everyone's slot when it filled
-- (decrement_active_on_full), so deleting it must NOT decrement again.
BEGIN;

SELECT plan(3);

CREATE OR REPLACE FUNCTION tests.make_user_del(p_email text)
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
DECLARE
  v_op uuid; v_b uuid; v_c uuid; v_d uuid;
BEGIN
  v_op := tests.make_user_del('op_del@akin.test');
  v_b  := tests.make_user_del('b_del@akin.test');
  v_c  := tests.make_user_del('c_del@akin.test');
  v_d  := tests.make_user_del('d_del@akin.test');
  PERFORM set_config('d.op', v_op::text, true);
  PERFORM set_config('d.b',  v_b::text,  true);
  PERFORM set_config('d.c',  v_c::text,  true);
  PERFORM set_config('d.d',  v_d::text,  true);
END; $$;

-- ---------------------------------------------------------------------------
-- Test 1: OP soft-deleting a not-full post frees the OP's active slot.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_post uuid;
BEGIN
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (current_setting('d.op')::uuid, 'OpDel1', 'Delete me', 'Body content here', 'vent_space')
  RETURNING id INTO v_post;
  -- add_op_as_participant sets the OP's active_post_count to 1.
  PERFORM set_config('d.before',
    (SELECT active_post_count FROM public.profiles
      WHERE user_id = current_setting('d.op')::uuid)::text, true);

  UPDATE public.posts SET status = 'deleted' WHERE id = v_post;

  PERFORM set_config('d.after',
    (SELECT active_post_count FROM public.profiles
      WHERE user_id = current_setting('d.op')::uuid)::text, true);
END; $$;

SELECT is(current_setting('d.before')::int, 1,
  'OP active_post_count is 1 after creating a post');

SELECT is(current_setting('d.after')::int, 0,
  'soft-deleting a not-full post frees the OP active slot');

-- ---------------------------------------------------------------------------
-- Test 2: deleting a FULL post does not double-decrement.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_post uuid;
BEGIN
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (current_setting('d.op')::uuid, 'OpDel1', 'Full post', 'Body content here', 'good_vibes')
  RETURNING id INTO v_post;

  -- Three unique commenters fill it → decrement_active_on_full returns all slots.
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
    VALUES (v_post, current_setting('d.b')::uuid, 'BDel1', 'comment one');
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
    VALUES (v_post, current_setting('d.c')::uuid, 'CDel1', 'comment two');
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
    VALUES (v_post, current_setting('d.d')::uuid, 'DDel1', 'comment three');

  PERFORM set_config('d.full_before',
    (SELECT active_post_count FROM public.profiles
      WHERE user_id = current_setting('d.op')::uuid)::text, true);

  UPDATE public.posts SET status = 'deleted' WHERE id = v_post;

  PERFORM set_config('d.full_after',
    (SELECT active_post_count FROM public.profiles
      WHERE user_id = current_setting('d.op')::uuid)::text, true);
END; $$;

SELECT is(
  current_setting('d.full_after')::int,
  current_setting('d.full_before')::int,
  'deleting a full post does not double-decrement active_post_count'
);

SELECT * FROM finish();
ROLLBACK;
