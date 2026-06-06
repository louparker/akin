-- supabase/tests/op_participant_removal.test.sql
-- pgTAP for 0017_op_participant_removal.sql
--
-- Feature: the post's OP can remove a commenter from the conversation.
-- After removal:
--   * The removed user can no longer comment on the post (P0004).
--   * The post disappears from the removed user's view (posts SELECT policy).
--   * The post's participant_count decrements; slot reopens.
--   * Existing comments by the removed user are marked removed_by_op = true.
--   * Audit log row written with action 'op_removed_participant'.
--
-- See ARCHITECTURE.md §4 for the participation invariants this respects.

BEGIN;

SELECT plan(17);

-- ---------------------------------------------------------------------------
-- Helpers — re-defined here per pgTAP file convention.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION tests.make_user(p_email text)
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
    v_uid, p_email, 'x', now(),
    now(), now(), '{}',
    jsonb_build_object('age_verified_at', now()::text),
    'authenticated', 'authenticated'
  );
  -- handle_new_user sets age_verified_at via raw_user_meta_data; profile.status = 'active'.
  RETURN v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION tests.make_post(p_author uuid, p_title text DEFAULT 'hello')
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_author::text, true);
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (
    p_author,
    (SELECT anonymous_identifier FROM public.profiles WHERE user_id = p_author),
    p_title, 'body text', 'vent_space'
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION tests.add_comment(p_post uuid, p_author uuid, p_body text DEFAULT 'reply')
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_author::text, true);
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (
    p_post, p_author,
    (SELECT anonymous_identifier FROM public.profiles WHERE user_id = p_author),
    p_body
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION tests.remove_participant(p_post uuid, p_op uuid, p_removed uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_op::text, true);
  INSERT INTO public.post_participant_removals (post_id, removed_user_id, removed_by)
  VALUES (p_post, p_removed, p_op);
END;
$$;

-- ---------------------------------------------------------------------------
-- Seed: an OP and three commenters (Alice as OP).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_alice uuid; v_bob uuid; v_carol uuid; v_dan uuid;
  v_post uuid;
BEGIN
  v_alice := tests.make_user('alice@opremove.test');
  v_bob   := tests.make_user('bob@opremove.test');
  v_carol := tests.make_user('carol@opremove.test');
  v_dan   := tests.make_user('dan@opremove.test');

  v_post := tests.make_post(v_alice, 'p1');
  PERFORM tests.add_comment(v_post, v_bob,   'bob says hi');
  PERFORM tests.add_comment(v_post, v_carol, 'carol says hi');

  PERFORM set_config('tests.alice', v_alice::text, true);
  PERFORM set_config('tests.bob',   v_bob::text,   true);
  PERFORM set_config('tests.carol', v_carol::text, true);
  PERFORM set_config('tests.dan',   v_dan::text,   true);
  PERFORM set_config('tests.post',  v_post::text,  true);
END; $$;

-- ---------------------------------------------------------------------------
-- Schema sanity
-- ---------------------------------------------------------------------------

SELECT has_table('public', 'post_participant_removals',
  'post_participant_removals table exists');

SELECT has_column('public', 'comments', 'removed_by_op',
  'comments.removed_by_op column exists');

SELECT col_default_is('public', 'comments', 'removed_by_op', 'false',
  'comments.removed_by_op defaults to false');

-- ---------------------------------------------------------------------------
-- Test 1: OP removes Bob — succeeds and the row exists
-- ---------------------------------------------------------------------------
SELECT lives_ok(
  format(
    $q$SELECT tests.remove_participant(%L::uuid, %L::uuid, %L::uuid)$q$,
    current_setting('tests.post')::uuid,
    current_setting('tests.alice')::uuid,
    current_setting('tests.bob')::uuid
  ),
  'OP removes Bob from the post — succeeds'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM public.post_participant_removals
     WHERE post_id = current_setting('tests.post')::uuid
       AND removed_user_id = current_setting('tests.bob')::uuid
  ),
  'removal row exists after OP action'
);

-- ---------------------------------------------------------------------------
-- Test 2: participant_count decremented (was 3 — Alice + Bob + Carol — now 2)
-- ---------------------------------------------------------------------------
SELECT is(
  (SELECT participant_count FROM public.posts
    WHERE id = current_setting('tests.post')::uuid),
  2,
  'participant_count goes from 3 to 2 after Bob is removed'
);

-- ---------------------------------------------------------------------------
-- Test 3: Bob's existing comment marked removed_by_op
-- ---------------------------------------------------------------------------
SELECT ok(
  (SELECT bool_and(removed_by_op)
     FROM public.comments
    WHERE post_id = current_setting('tests.post')::uuid
      AND author_id = current_setting('tests.bob')::uuid),
  'all of Bob''s comments on the post now have removed_by_op = true'
);

-- ---------------------------------------------------------------------------
-- Test 4: Bob's comment INSERT now raises P0004
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  format(
    $q$SELECT tests.add_comment(%L::uuid, %L::uuid, 'sneaking back in')$q$,
    current_setting('tests.post')::uuid,
    current_setting('tests.bob')::uuid
  ),
  'P0004',
  NULL,
  'removed user comment INSERT raises P0004 REMOVED_FROM_POST'
);

-- ---------------------------------------------------------------------------
-- Test 5: Bob can no longer SELECT the post (posts SELECT policy filters him out)
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.bob'), true);
SET LOCAL ROLE authenticated;

SELECT ok(
  NOT EXISTS(
    SELECT 1 FROM public.posts
     WHERE id = current_setting('tests.post')::uuid
  ),
  'removed user does not see the post in posts SELECT'
);

SELECT ok(
  NOT EXISTS(
    SELECT 1 FROM public.comments
     WHERE post_id = current_setting('tests.post')::uuid
  ),
  'removed user does not see comments on the post'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 6: Alice (OP) still sees the post and Bob's [removed] comment
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.alice'), true);
SET LOCAL ROLE authenticated;

SELECT ok(
  EXISTS(
    SELECT 1 FROM public.posts
     WHERE id = current_setting('tests.post')::uuid
  ),
  'OP still sees the post after removal'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM public.comments
     WHERE post_id = current_setting('tests.post')::uuid
       AND author_id = current_setting('tests.bob')::uuid
       AND removed_by_op = true
  ),
  'OP still sees Bob''s comments (marked removed_by_op) so UI can render placeholder'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 7: slot reopens — Dan can now join the post (was 3/4-cap accounting; now 2/4)
--          Dan was not a participant; previously had 3 slots open in 0 posts;
--          should be able to comment.
-- ---------------------------------------------------------------------------
SELECT lives_ok(
  format(
    $q$SELECT tests.add_comment(%L::uuid, %L::uuid, 'dan joins')$q$,
    current_setting('tests.post')::uuid,
    current_setting('tests.dan')::uuid
  ),
  'a new commenter (Dan) can join after OP frees a slot'
);

SELECT is(
  (SELECT participant_count FROM public.posts
    WHERE id = current_setting('tests.post')::uuid),
  3,
  'participant_count back to 3 after Dan joins'
);

-- ---------------------------------------------------------------------------
-- Test 8: non-OP cannot insert a removal — RLS denies
-- ---------------------------------------------------------------------------
-- Carol (a participant but not OP) attempts to remove Dan.
SELECT set_config('request.jwt.claim.sub', current_setting('tests.carol'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format(
    $q$INSERT INTO public.post_participant_removals (post_id, removed_user_id, removed_by)
       VALUES (%L::uuid, %L::uuid, %L::uuid)$q$,
    current_setting('tests.post')::uuid,
    current_setting('tests.dan')::uuid,
    current_setting('tests.carol')::uuid
  ),
  NULL,
  NULL,
  'non-OP attempting to insert a removal is rejected'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 9: OP cannot remove themselves — CHECK constraint
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  format(
    $q$INSERT INTO public.post_participant_removals (post_id, removed_user_id, removed_by)
       VALUES (%L::uuid, %L::uuid, %L::uuid)$q$,
    current_setting('tests.post')::uuid,
    current_setting('tests.alice')::uuid,
    current_setting('tests.alice')::uuid
  ),
  NULL,
  NULL,
  'OP cannot remove themselves — CHECK constraint rejects'
);

-- ---------------------------------------------------------------------------
-- Test 10: audit log written
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS(
    SELECT 1 FROM public.audit_log
     WHERE action = 'op_removed_participant'
       AND target_type = 'post'
       AND target_id = current_setting('tests.post')::uuid
       AND actor_id = current_setting('tests.alice')::uuid
       AND metadata->>'removed_user_id' = current_setting('tests.bob')
  ),
  'audit_log row written for op_removed_participant'
);

SELECT * FROM finish();
ROLLBACK;
