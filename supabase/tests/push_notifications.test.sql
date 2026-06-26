BEGIN;
SELECT plan(8);

CREATE OR REPLACE FUNCTION tests.pn_user(p_email text)
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
DECLARE va uuid; vb uuid;
BEGIN
  va := tests.pn_user('push_a@akin.test');
  vb := tests.pn_user('push_b@akin.test');
  PERFORM set_config('t.push_a', va::text, true);
  PERFORM set_config('t.push_b', vb::text, true);
END; $$;

SELECT has_table('public', 'notification_preferences', 'notification_preferences table exists');
SELECT has_table('public', 'push_tokens', 'push_tokens table exists');

SELECT set_config('request.jwt.claim.sub', current_setting('t.push_a'), true);
SET LOCAL ROLE authenticated;

INSERT INTO public.notification_preferences (user_id, push_replies)
VALUES (current_setting('t.push_a')::uuid, true);

SELECT is(
  (SELECT push_replies FROM public.notification_preferences
   WHERE user_id = current_setting('t.push_a')::uuid),
  true,
  'user can insert own notification preference'
);

SELECT throws_ok(
  format($q$INSERT INTO public.notification_preferences (user_id, push_replies)
             VALUES (%L, true)$q$, current_setting('t.push_b')::uuid),
  null,
  'user cannot insert another user notification preference'
);

INSERT INTO public.push_tokens (user_id, expo_push_token, platform)
VALUES (current_setting('t.push_a')::uuid, 'ExpoPushToken[aaaaaaaaaaaaaaaaaaaa]', 'ios');

SELECT ok(
  EXISTS(
    SELECT 1 FROM public.push_tokens
     WHERE user_id = current_setting('t.push_a')::uuid
       AND enabled = true
  ),
  'user can insert own push token'
);

SELECT throws_ok(
  format($q$INSERT INTO public.push_tokens (user_id, expo_push_token, platform)
             VALUES (%L, 'ExpoPushToken[bbbbbbbbbbbbbbbbbbbb]', 'ios')$q$,
    current_setting('t.push_b')::uuid),
  null,
  'user cannot insert another user push token'
);

UPDATE public.push_tokens
   SET enabled = false
 WHERE user_id = current_setting('t.push_a')::uuid;

SELECT is(
  (SELECT enabled FROM public.push_tokens
   WHERE user_id = current_setting('t.push_a')::uuid
   LIMIT 1),
  false,
  'user can update own push token'
);

SELECT is(
  (SELECT count(*)::int FROM public.push_tokens
   WHERE user_id = current_setting('t.push_b')::uuid),
  0,
  'RLS hides other users push tokens'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
