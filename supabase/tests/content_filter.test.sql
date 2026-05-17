-- supabase/tests/content_filter.test.sql
BEGIN;
SELECT plan(7);

CREATE OR REPLACE FUNCTION tests.cfu(p_email text)
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
DECLARE vu uuid;
BEGIN
  vu := tests.cfu('filter_user@akin.test');
  PERFORM set_config('t.u', vu::text, true);
END; $$;

-- Test 1: clean post passes filter
SELECT lives_ok(
  format($q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
             VALUES (%L, 'FilterUser1', 'Normal post', 'This is perfectly fine content.', 'vent_space')$q$,
    current_setting('t.u')::uuid),
  'clean post passes content filter'
);

-- Test 2: post containing a slur is rejected
SELECT throws_ok(
  format($q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
             VALUES (%L, 'FilterUser1', 'Normal title', 'This is cunt content', 'vent_space')$q$,
    current_setting('t.u')::uuid),
  'P0010',
  'CONTENT_FILTER_HIT',
  'post with slur is rejected with CONTENT_FILTER_HIT'
);

-- Test 3: case-insensitive slur matching
SELECT throws_ok(
  format($q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
             VALUES (%L, 'FilterUser1', 'Normal title', 'Some RETARD content here', 'vent_space')$q$,
    current_setting('t.u')::uuid),
  'P0010',
  'CONTENT_FILTER_HIT',
  'slur matching is case-insensitive'
);

-- Test 4: post containing a phone number is rejected
SELECT throws_ok(
  format($q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
             VALUES (%L, 'FilterUser1', 'Normal title', 'Call me on 07123 456789 sometime', 'vent_space')$q$,
    current_setting('t.u')::uuid),
  'P0011',
  'CONTACT_INFO_NOT_ALLOWED',
  'post with phone number rejected with CONTACT_INFO_NOT_ALLOWED'
);

-- Test 5: post containing an email address is rejected
SELECT throws_ok(
  format($q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
             VALUES (%L, 'FilterUser1', 'Normal title', 'Email me at test@example.com', 'vent_space')$q$,
    current_setting('t.u')::uuid),
  'P0011',
  'CONTACT_INFO_NOT_ALLOWED',
  'post with email address rejected with CONTACT_INFO_NOT_ALLOWED'
);

-- Test 6: post containing a social handle pattern is rejected
SELECT throws_ok(
  format($q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
             VALUES (%L, 'FilterUser1', 'Normal title', 'Add me on snapchat: myhandle123', 'vent_space')$q$,
    current_setting('t.u')::uuid),
  'P0011',
  'CONTACT_INFO_NOT_ALLOWED',
  'post with snapchat handle rejected with CONTACT_INFO_NOT_ALLOWED'
);

-- Test 7: Swedish slur is rejected
SELECT throws_ok(
  format($q$INSERT INTO public.posts (author_id, author_identifier, title, body, category)
             VALUES (%L, 'FilterUser1', 'Normal title', 'Du är en hora', 'vent_space')$q$,
    current_setting('t.u')::uuid),
  'P0010',
  'CONTENT_FILTER_HIT',
  'Swedish slur is rejected'
);

SELECT * FROM finish();
ROLLBACK;
