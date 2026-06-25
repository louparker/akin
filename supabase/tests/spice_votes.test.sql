-- supabase/tests/spice_votes.test.sql
BEGIN;
SELECT plan(11);

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
  v_op uuid; v_voter uuid; v_auth_voter uuid; v_outsider uuid;
  v_commenter uuid; v_legacy_commenter uuid; v_removed_commenter uuid;
  v_post uuid; v_comment_post uuid;
BEGIN
  v_op         := tests.su('op_spice@akin.test');
  v_voter      := tests.su('voter_spice@akin.test');
  v_auth_voter := tests.su('auth_voter_spice@akin.test');
  v_outsider   := tests.su('outsider_spice@akin.test');
  v_commenter  := tests.su('commenter_spice@akin.test');
  v_legacy_commenter := tests.su('legacy_commenter_spice@akin.test');
  v_removed_commenter := tests.su('removed_commenter_spice@akin.test');
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (v_op, 'OpSpice1', 'Spice test post', 'Body here', 'good_vibes')
  RETURNING id INTO v_post;
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (v_op, 'OpSpice1', 'Comment spice test post', 'Body here', 'good_vibes')
  RETURNING id INTO v_comment_post;
  INSERT INTO public.post_participants (post_id, user_id)
  VALUES (v_post, v_auth_voter), (v_post, v_voter);
  PERFORM set_config('t.op',         v_op::text,         true);
  PERFORM set_config('t.voter',      v_voter::text,      true);
  PERFORM set_config('t.auth_voter', v_auth_voter::text, true);
  PERFORM set_config('t.outsider',   v_outsider::text,   true);
  PERFORM set_config('t.commenter',  v_commenter::text,  true);
  PERFORM set_config('t.legacy_commenter', v_legacy_commenter::text, true);
  PERFORM set_config('t.removed_commenter', v_removed_commenter::text, true);
  PERFORM set_config('t.post',       v_post::text,       true);
  PERFORM set_config('t.comment_post', v_comment_post::text, true);
END; $$;

-- Test 1: authenticated participant can vote and the trigger updates the post aggregate.
-- Regression: maintain_spice_averages must bypass posts RLS because the voter
-- is not the post author and cannot directly update posts.
SELECT set_config('request.jwt.claim.sub', current_setting('t.auth_voter'), true);
SET LOCAL ROLE authenticated;

INSERT INTO public.spice_votes (post_id, user_id, score)
VALUES (
  current_setting('t.post')::uuid,
  current_setting('t.auth_voter')::uuid,
  5
);

RESET ROLE;

SELECT is(
  (SELECT spice_vote_count FROM public.posts WHERE id = current_setting('t.post')::uuid),
  1, 'authenticated participant vote increments spice_vote_count'
);

-- Test 2: participant can vote 1-5 on someone else's post
INSERT INTO public.spice_votes (post_id, user_id, score)
VALUES (current_setting('t.post')::uuid, current_setting('t.voter')::uuid, 4);

SELECT is(
  (SELECT spice_vote_count FROM public.posts WHERE id = current_setting('t.post')::uuid),
  2, 'spice_vote_count increments on vote insert'
);

-- Test 3: OP can vote on their own active post because they are a participant.
SELECT set_config('request.jwt.claim.sub', current_setting('t.op'), true);
SET LOCAL ROLE authenticated;

INSERT INTO public.spice_votes (post_id, user_id, score)
VALUES (
  current_setting('t.post')::uuid,
  current_setting('t.op')::uuid,
  3
);

RESET ROLE;

SELECT is(
  (SELECT spice_vote_count FROM public.posts WHERE id = current_setting('t.post')::uuid),
  3, 'OP vote increments spice_vote_count'
);

-- Test 4: a user who comments through the authenticated path can vote immediately.
SELECT set_config('request.jwt.claim.sub', current_setting('t.commenter'), true);
SET LOCAL ROLE authenticated;

INSERT INTO public.comments (post_id, author_id, author_identifier, body)
VALUES (
  current_setting('t.comment_post')::uuid,
  current_setting('t.commenter')::uuid,
  'Commenter1',
  'Joining this conversation'
);

INSERT INTO public.spice_votes (post_id, user_id, score)
VALUES (
  current_setting('t.comment_post')::uuid,
  current_setting('t.commenter')::uuid,
  4
);

RESET ROLE;

SELECT is(
  (SELECT spice_vote_count FROM public.posts WHERE id = current_setting('t.comment_post')::uuid),
  1, 'commenter can vote after comment creates participation'
);

-- Test 5: active comments are also accepted if the participant ledger is missing.
-- This covers historical/drifted data where comments exist but post_participants
-- was not backfilled.
DO $$
BEGIN
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (
    current_setting('t.comment_post')::uuid,
    current_setting('t.legacy_commenter')::uuid,
    'Legacy1',
    'Existing active comment'
  );
  DELETE FROM public.post_participants
   WHERE post_id = current_setting('t.comment_post')::uuid
     AND user_id = current_setting('t.legacy_commenter')::uuid;
END; $$;

SELECT set_config('request.jwt.claim.sub', current_setting('t.legacy_commenter'), true);
SET LOCAL ROLE authenticated;

INSERT INTO public.spice_votes (post_id, user_id, score)
VALUES (
  current_setting('t.comment_post')::uuid,
  current_setting('t.legacy_commenter')::uuid,
  3
);

RESET ROLE;

SELECT is(
  (SELECT spice_vote_count FROM public.posts WHERE id = current_setting('t.comment_post')::uuid),
  2, 'active commenter can vote even if participant ledger is missing'
);

-- Test 6: removed commenters are not accepted via the active-comment fallback.
DO $$
BEGIN
  INSERT INTO public.comments (post_id, author_id, author_identifier, body, removed_by_op)
  VALUES (
    current_setting('t.comment_post')::uuid,
    current_setting('t.removed_commenter')::uuid,
    'Removed1',
    'Removed comment',
    true
  );
  DELETE FROM public.post_participants
   WHERE post_id = current_setting('t.comment_post')::uuid
     AND user_id = current_setting('t.removed_commenter')::uuid;
END; $$;

SELECT set_config('request.jwt.claim.sub', current_setting('t.removed_commenter'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format($q$INSERT INTO public.spice_votes (post_id, user_id, score)
             VALUES (%L, %L, 2)$q$,
    current_setting('t.comment_post')::uuid, current_setting('t.removed_commenter')::uuid),
  null, 'removed commenter cannot vote through removed comments'
);

RESET ROLE;

-- Test 7: outsider cannot vote without being a participant.
SELECT set_config('request.jwt.claim.sub', current_setting('t.outsider'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format($q$INSERT INTO public.spice_votes (post_id, user_id, score)
             VALUES (%L, %L, 2)$q$,
    current_setting('t.post')::uuid, current_setting('t.outsider')::uuid),
  null, 'non-participant cannot vote on active post'
);

RESET ROLE;

-- Test 8: changing vote updates average correctly
SELECT set_config('request.jwt.claim.sub', current_setting('t.voter'), true);
SET LOCAL ROLE authenticated;

UPDATE public.spice_votes
   SET score = 2
 WHERE post_id = current_setting('t.post')::uuid
   AND user_id = current_setting('t.voter')::uuid;

RESET ROLE;

SELECT is(
  (SELECT total_spice_score FROM public.posts WHERE id = current_setting('t.post')::uuid),
  10, 'updating vote recalculates total_spice_score'
);

-- Test 9: deleting vote removes it from average
DELETE FROM public.spice_votes
 WHERE post_id = current_setting('t.post')::uuid
   AND user_id = current_setting('t.voter')::uuid;

SELECT is(
  (SELECT spice_vote_count FROM public.posts WHERE id = current_setting('t.post')::uuid),
  2, 'deleting vote decrements spice_vote_count'
);

SELECT is(
  (SELECT average_spice_level FROM public.posts WHERE id = current_setting('t.post')::uuid),
  4.00::numeric, 'average_spice_level reflects remaining votes'
);

-- Test 10: vote score outside 1-5 is rejected
SELECT throws_ok(
  format($q$INSERT INTO public.spice_votes (post_id, user_id, score)
             VALUES (%L, %L, 6)$q$,
    current_setting('t.post')::uuid, current_setting('t.voter')::uuid),
  null, 'vote score > 5 is rejected'
);

SELECT * FROM finish();
ROLLBACK;
