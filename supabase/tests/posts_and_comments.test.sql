-- supabase/tests/posts_and_comments.test.sql
-- pgTAP tests for 0003_create_posts_and_comments.sql
BEGIN;

SELECT plan(8);

-- ---------------------------------------------------------------------------
-- Setup helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION tests.make_user(p_email text, p_age_verified boolean DEFAULT true)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := extensions.uuid_generate_v4();
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
  ) VALUES (
    v_uid, p_email, 'x',
    now(), -- email confirmed
    now(), now(), '{}', '{}', 'authenticated', 'authenticated'
  );
  IF p_age_verified THEN
    UPDATE public.profiles SET age_verified_at = now() WHERE user_id = v_uid;
  END IF;
  RETURN v_uid;
END;
$$;

DO $$
DECLARE
  v_alice uuid;
  v_unverified uuid;
BEGIN
  v_alice      := tests.make_user('alice_posts@akin.test', true);
  v_unverified := tests.make_user('unverified@akin.test', false);

  -- Store for later tests
  PERFORM set_config('tests.alice',      v_alice::text,      true);
  PERFORM set_config('tests.unverified', v_unverified::text, true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Test 1: unverified user cannot insert a post (no age_verified_at)
-- Must run as 'authenticated' role so that RLS WITH CHECK fires.
-- Without SET ROLE, postgres bypasses RLS and the INSERT would succeed.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', current_setting('tests.unverified'), true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format(
    $q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
       VALUES (%L, 'UnverifiedFox1', 'Test', 'Body text here', 'vent_space')$q$,
    current_setting('tests.unverified')::uuid
  ),
  null,
  'unverified user cannot insert a post'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Test 2: verified user can insert a post
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_post_id uuid;
BEGIN
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (
    current_setting('tests.alice')::uuid,
    'AliceFox1',
    'My first post',
    'Body content here for Alice',
    'vent_space'
  )
  RETURNING id INTO v_post_id;

  PERFORM set_config('tests.post_id', v_post_id::text, true);
END;
$$;

SELECT ok(
  EXISTS(SELECT 1 FROM public.posts WHERE id = current_setting('tests.post_id')::uuid),
  'verified user can insert a post'
);

-- ---------------------------------------------------------------------------
-- Test 3: post with status='hidden' is invisible to public SELECT
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  UPDATE public.posts
     SET status = 'hidden'
   WHERE id = current_setting('tests.post_id')::uuid;
END;
$$;

SELECT is(
  (SELECT count(*)::int FROM public.posts
   WHERE id = current_setting('tests.post_id')::uuid
     AND status = 'active'),
  0,
  'hidden post does not appear in active-only reads'
);

-- Restore
DO $$
BEGIN
  UPDATE public.posts SET status = 'active'
  WHERE id = current_setting('tests.post_id')::uuid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Test 4: is_full generated column works
-- ---------------------------------------------------------------------------
SELECT is(
  (SELECT is_full FROM public.posts WHERE id = current_setting('tests.post_id')::uuid),
  false,
  'new post with participant_count=1 is not full'
);

-- ---------------------------------------------------------------------------
-- Test 5: FK on comments → posts is enforced
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  format(
    $q$INSERT INTO public.comments (post_id, author_id, author_identifier, body)
       VALUES (%L, %L, 'AliceFox1', 'comment body')$q$,
    extensions.uuid_generate_v4(), -- non-existent post
    current_setting('tests.alice')::uuid
  ),
  null,
  'comment FK to posts is enforced'
);

-- ---------------------------------------------------------------------------
-- Test 6: deleting a post cascades to comments
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_comment_id uuid;
BEGIN
  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (
    current_setting('tests.post_id')::uuid,
    current_setting('tests.alice')::uuid,
    'AliceFox1',
    'A comment to be cascade-deleted'
  )
  RETURNING id INTO v_comment_id;

  PERFORM set_config('tests.comment_id', v_comment_id::text, true);
END;
$$;

DO $$
BEGIN
  DELETE FROM public.posts WHERE id = current_setting('tests.post_id')::uuid;
END;
$$;

SELECT ok(
  NOT EXISTS(SELECT 1 FROM public.comments WHERE id = current_setting('tests.comment_id')::uuid),
  'deleting a post cascades to its comments'
);

-- ---------------------------------------------------------------------------
-- Test 7: title length constraint — too short
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  format(
    $q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
       VALUES (%L, 'AliceFox1', '', 'valid body content', 'vent_space')$q$,
    current_setting('tests.alice')::uuid
  ),
  null,
  'empty title is rejected by check constraint'
);

-- ---------------------------------------------------------------------------
-- Test 8: comment_count increments on comment insert
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_post_id uuid;
BEGIN
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (
    current_setting('tests.alice')::uuid,
    'AliceFox1', 'Count test post', 'Body here', 'advice_needed'
  )
  RETURNING id INTO v_post_id;

  PERFORM set_config('tests.count_post', v_post_id::text, true);

  INSERT INTO public.comments (post_id, author_id, author_identifier, body)
  VALUES (v_post_id, current_setting('tests.alice')::uuid, 'AliceFox1', 'hi');
END;
$$;

SELECT is(
  (SELECT comment_count FROM public.posts WHERE id = current_setting('tests.count_post')::uuid),
  1,
  'comment_count increments on comment insert'
);

SELECT * FROM finish();
ROLLBACK;
