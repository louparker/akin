-- supabase/tests/spice_votes.test.sql
BEGIN;
SELECT plan(6);

CREATE OR REPLACE FUNCTION tests.su(p_email text)
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
DECLARE
  v_op uuid; v_voter uuid; v_post uuid;
BEGIN
  v_op    := tests.su('op_spice@akin.test');
  v_voter := tests.su('voter_spice@akin.test');
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (v_op, 'OpSpice1', 'Spice test post', 'Body here', 'good_vibes')
  RETURNING id INTO v_post;
  PERFORM set_config('t.op',    v_op::text,    true);
  PERFORM set_config('t.voter', v_voter::text, true);
  PERFORM set_config('t.post',  v_post::text,  true);
END; $$;

-- Test 1: voter can vote 1-5 on someone else's post
INSERT INTO public.spice_votes (post_id, user_id, score)
VALUES (current_setting('t.post')::uuid, current_setting('t.voter')::uuid, 4);

SELECT is(
  (SELECT spice_vote_count FROM public.posts WHERE id = current_setting('t.post')::uuid),
  1, 'spice_vote_count increments on vote insert'
);

-- Test 2: cannot vote on own post (RLS WITH CHECK blocks it — must run as authenticated)
SELECT set_config('request.jwt.claim.sub', current_setting('t.op'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format($q$INSERT INTO public.spice_votes (post_id, user_id, score)
             VALUES (%L, %L, 3)$q$,
    current_setting('t.post')::uuid, current_setting('t.op')::uuid),
  null, 'cannot vote on own post'
);

RESET ROLE;

-- Test 3: changing vote updates average correctly
UPDATE public.spice_votes
   SET score = 2
 WHERE post_id = current_setting('t.post')::uuid
   AND user_id = current_setting('t.voter')::uuid;

SELECT is(
  (SELECT total_spice_score FROM public.posts WHERE id = current_setting('t.post')::uuid),
  2, 'updating vote recalculates total_spice_score'
);

-- Test 4: deleting vote removes it from average
DELETE FROM public.spice_votes
 WHERE post_id = current_setting('t.post')::uuid
   AND user_id = current_setting('t.voter')::uuid;

SELECT is(
  (SELECT spice_vote_count FROM public.posts WHERE id = current_setting('t.post')::uuid),
  0, 'deleting vote decrements spice_vote_count'
);

SELECT is(
  (SELECT average_spice_level FROM public.posts WHERE id = current_setting('t.post')::uuid),
  null, 'average_spice_level is NULL when vote count is 0'
);

-- Test 5: vote score outside 1-5 is rejected
SELECT throws_ok(
  format($q$INSERT INTO public.spice_votes (post_id, user_id, score)
             VALUES (%L, %L, 6)$q$,
    current_setting('t.post')::uuid, current_setting('t.voter')::uuid),
  null, 'vote score > 5 is rejected'
);

SELECT * FROM finish();
ROLLBACK;
