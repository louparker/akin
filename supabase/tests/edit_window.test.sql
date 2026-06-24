-- supabase/tests/edit_window.test.sql
-- pgTAP tests for 0004_edit_window.sql + 0025_delete_anytime_edit_window.sql
--
-- Guard/edit-window tests run as SET LOCAL ROLE authenticated + JWT so the
-- current_user check in the enforce_*_update_columns triggers fires for client
-- code paths. After 0025 the 15-minute window is enforced by the trigger
-- (P0021) for body/title edits, while soft-delete (active→deleted) is allowed
-- at any time.
BEGIN;

SELECT plan(10);

-- ---------------------------------------------------------------------------
-- Setup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tests.make_verified_user(p_email text)
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
  v_alice      uuid;
  v_bob        uuid;
  v_main       uuid;
  v_old        uuid;
  v_post2      uuid;
  v_bcpost     uuid;
  v_oldcomment uuid;
BEGIN
  v_alice := tests.make_verified_user('alice_edit@akin.test');
  v_bob   := tests.make_verified_user('bob_edit@akin.test');

  -- Alice's main post (new, within edit window) — used for tests 1, 2, 3, 5
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (v_alice, 'AliceEdit1', 'Original title', 'Original body text here', 'vent_space')
  RETURNING id INTO v_main;

  -- Bob's old post (> 15 minutes) — used for tests 4 (edit blocked) + 8 (delete ok)
  INSERT INTO public.posts (author_id, author_identifier, title, body, category,
                            created_at, updated_at)
  VALUES (v_bob, 'BobEdit1', 'Old post', 'Old body content here', 'vent_space',
          now() - interval '20 minutes', now() - interval '20 minutes')
  RETURNING id INTO v_old;

  -- Alice's second post — used for test 6 (status=hidden rejection)
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (v_alice, 'AliceEdit1', 'Post two', 'Body content here two', 'good_vibes')
  RETURNING id INTO v_post2;

  -- Bob's old post + old comment — used for tests 9 (edit blocked) + 10 (delete ok)
  INSERT INTO public.posts (author_id, author_identifier, title, body, category,
                            created_at, updated_at)
  VALUES (v_bob, 'BobEdit1', 'Bob old post two', 'Bob old body content', 'good_vibes',
          now() - interval '30 minutes', now() - interval '30 minutes')
  RETURNING id INTO v_bcpost;

  INSERT INTO public.comments (post_id, author_id, author_identifier, body, created_at)
  VALUES (v_bcpost, v_bob, 'BobEdit1', 'bob old comment', now() - interval '30 minutes')
  RETURNING id INTO v_oldcomment;

  PERFORM set_config('tests.alice',      v_alice::text,      true);
  PERFORM set_config('tests.bob',        v_bob::text,        true);
  PERFORM set_config('tests.main',       v_main::text,       true);
  PERFORM set_config('tests.old',        v_old::text,        true);
  PERFORM set_config('tests.post2',      v_post2::text,      true);
  PERFORM set_config('tests.oldcomment', v_oldcomment::text, true);
END; $$;

-- ---------------------------------------------------------------------------
-- Test 1: author can update body within edit window (runs as postgres — guard
-- bypasses for internal/service context, which is what we want here)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  UPDATE public.posts SET body = 'Updated body within window'
  WHERE id = current_setting('tests.main')::uuid;
END; $$;

SELECT is(
  (SELECT body FROM public.posts WHERE id = current_setting('tests.main')::uuid),
  'Updated body within window',
  'body can be updated within the 15-minute edit window'
);

-- ---------------------------------------------------------------------------
-- Test 2: cannot change category (guard trigger, requires authenticated role)
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.alice'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format($q$UPDATE public.posts SET category = 'good_vibes' WHERE id = %L$q$,
    current_setting('tests.main')::uuid),
  'P0020',
  'UPDATE_NOT_ALLOWED: cannot change category',
  'cannot change category (guard fires for authenticated clients)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 3: cannot change author_id (guard trigger, authenticated context)
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.alice'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format($q$UPDATE public.posts SET author_id = %L WHERE id = %L$q$,
    current_setting('tests.bob')::uuid, current_setting('tests.main')::uuid),
  'P0020',
  'UPDATE_NOT_ALLOWED: cannot change author_id',
  'cannot change author_id (guard fires for authenticated clients)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 4: editing a post older than 15 minutes is rejected by the edit-window
-- guard (P0021). After 0025 the RLS time gate is gone, so the UPDATE reaches
-- the trigger, which blocks the body change.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.bob'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format($q$UPDATE public.posts SET body = 'should not change' WHERE id = %L$q$,
    current_setting('tests.old')::uuid),
  'P0021',
  'EDIT_WINDOW_CLOSED: edits are only allowed within 15 minutes of posting',
  'editing a post older than the 15-minute window is rejected (P0021)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 5: self soft-delete (active → deleted) is allowed (as postgres/service)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  UPDATE public.posts SET status = 'deleted'
  WHERE id = current_setting('tests.main')::uuid;
END; $$;

SELECT is(
  (SELECT status::text FROM public.posts WHERE id = current_setting('tests.main')::uuid),
  'deleted',
  'author can soft-delete own post (active→deleted is allowed)'
);

-- ---------------------------------------------------------------------------
-- Test 6: cannot set status to 'hidden' via client UPDATE
-- (only moderators can hide posts; goes through guard trigger)
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.alice'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format($q$UPDATE public.posts SET status = 'hidden' WHERE id = %L$q$,
    current_setting('tests.post2')::uuid),
  'P0020',
  'UPDATE_NOT_ALLOWED: status can only change active→deleted',
  'cannot set status to hidden via client update (guard blocks it)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 7: comment body can be updated within the edit window
-- Alice is OP of post3 (3rd post — within the 3-post active limit).
-- She leaves a comment and edits it. guard bypasses for postgres context.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_post3   uuid;
  v_comment uuid;
BEGIN
  -- alice's 3rd post (alice already has 2 from setup: main and post2)
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (current_setting('tests.alice')::uuid, 'AliceEdit1',
          'Post three', 'Body content here three', 'vent_space')
  RETURNING id INTO v_post3;

  -- OP comment on own post
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (v_post3, current_setting('tests.alice')::uuid, 'AliceEdit1', 'original comment')
  RETURNING id INTO v_comment;

  -- Edit the comment within window
  UPDATE public.comments SET body = 'edited comment' WHERE id = v_comment;

  PERFORM set_config('tests.edited_body',
    (SELECT body FROM public.comments WHERE id = v_comment), true);
END; $$;

SELECT is(
  current_setting('tests.edited_body'),
  'edited comment',
  'comment body can be updated within the edit window'
);

-- ---------------------------------------------------------------------------
-- Test 8: soft-deleting a post older than 15 minutes is allowed at any time
-- (delete-anytime, the core 0025 behaviour).
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.bob'), true);
SET LOCAL ROLE authenticated;

-- Bare top-level UPDATE (not a DO block): auth.uid() reads request.jwt.claim.sub
-- here, but does NOT propagate into a nested PL/pgSQL DO context, which would
-- make the WITH CHECK see auth.uid() = NULL and reject the row.
UPDATE public.posts SET status = 'deleted'
WHERE id = current_setting('tests.old')::uuid;

RESET ROLE;

SELECT is(
  (SELECT status::text FROM public.posts WHERE id = current_setting('tests.old')::uuid),
  'deleted',
  'author can soft-delete own post after the edit window (delete anytime)'
);

-- ---------------------------------------------------------------------------
-- Test 9: editing a comment older than 15 minutes is rejected (P0021)
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.bob'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format($q$UPDATE public.comments SET body = 'late edit' WHERE id = %L$q$,
    current_setting('tests.oldcomment')::uuid),
  'P0021',
  'EDIT_WINDOW_CLOSED: edits are only allowed within 15 minutes of posting',
  'editing a comment older than the 15-minute window is rejected (P0021)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 10: soft-deleting a comment older than 15 minutes is allowed at any time
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.bob'), true);
SET LOCAL ROLE authenticated;

-- Bare top-level UPDATE (see note on test 8) so auth.uid() resolves to bob.
UPDATE public.comments SET status = 'deleted'
WHERE id = current_setting('tests.oldcomment')::uuid;

RESET ROLE;

SELECT is(
  (SELECT status::text FROM public.comments WHERE id = current_setting('tests.oldcomment')::uuid),
  'deleted',
  'author can soft-delete own comment after the edit window (delete anytime)'
);

SELECT * FROM finish();
ROLLBACK;
