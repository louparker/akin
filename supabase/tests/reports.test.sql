-- supabase/tests/reports.test.sql
BEGIN;
SELECT plan(5);

CREATE OR REPLACE FUNCTION tests.ru(p_email text)
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
DECLARE vr uuid; vt uuid; vp uuid;
BEGIN
  vr := tests.ru('reporter@akin.test');
  vt := tests.ru('target_r@akin.test');
  INSERT INTO public.posts (author_id, author_identifier, title, body, category)
  VALUES (vt, 'TargetR1', 'Target post', 'Target body text here', 'vent_space')
  RETURNING id INTO vp;
  PERFORM set_config('t.reporter', vr::text, true);
  PERFORM set_config('t.target',   vt::text, true);
  PERFORM set_config('t.post',     vp::text, true);
END; $$;

-- Test 1: user can file a report on a post
INSERT INTO public.reports (reporter_id, target_type, target_id, reason)
VALUES (current_setting('t.reporter')::uuid, 'post',
        current_setting('t.post')::uuid, 'spam');

SELECT ok(
  EXISTS(SELECT 1 FROM public.reports
         WHERE reporter_id = current_setting('t.reporter')::uuid),
  'reporter can file a report'
);

-- Test 2: reporter can select own reports
SELECT ok(
  EXISTS(SELECT 1 FROM public.reports
         WHERE reporter_id = current_setting('t.reporter')::uuid),
  'reporter can select own reports'
);

-- Test 3: 6th report in an hour is rejected
DO $$
DECLARE i int;
BEGIN
  FOR i IN 2..5 LOOP
    INSERT INTO public.reports (reporter_id, target_type, target_id, reason)
    VALUES (current_setting('t.reporter')::uuid, 'post',
            current_setting('t.post')::uuid, 'spam');
  END LOOP;
END; $$;

SELECT throws_ok(
  format($q$INSERT INTO public.reports (reporter_id, target_type, target_id, reason)
             VALUES (%L, 'post', %L, 'spam')$q$,
    current_setting('t.reporter')::uuid, current_setting('t.post')::uuid),
  'P0030',
  'REPORT_RATE_LIMIT',
  '6th report within 1 hour is rejected with REPORT_RATE_LIMIT'
);

-- Test 4: cannot report yourself
SELECT throws_ok(
  format($q$INSERT INTO public.reports (reporter_id, target_type, target_id, reason)
             VALUES (%L, 'user', %L, 'other')$q$,
    current_setting('t.reporter')::uuid, current_setting('t.reporter')::uuid),
  null, 'cannot report yourself'
);

-- Test 5: filed report has status 'open'
SELECT is(
  (SELECT status::text FROM public.reports
   WHERE reporter_id = current_setting('t.reporter')::uuid
   ORDER BY created_at ASC LIMIT 1),
  'open', 'filed report starts with status open'
);

SELECT * FROM finish();
ROLLBACK;
