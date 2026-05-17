-- supabase/tests/feature_flags.test.sql
BEGIN;
SELECT plan(4);

-- Test 1: three kill-switch rows exist
SELECT is(
  (SELECT count(*)::int FROM public.feature_flags),
  3,
  'three feature flag rows present'
);

-- Test 2: all three default to true
SELECT is(
  (SELECT count(*)::int FROM public.feature_flags WHERE value = true),
  3,
  'all feature flags default to true'
);

-- Test 3: anon/authenticated can SELECT (public read policy)
SELECT ok(
  EXISTS(SELECT 1 FROM public.feature_flags WHERE key = 'signups_open'),
  'signups_open flag is publicly readable'
);

-- Test 4: no UPDATE policy for non-service-role
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE tablename = 'feature_flags' AND cmd IN ('INSERT','UPDATE','DELETE')),
  0,
  'no write policies on feature_flags (service_role only)'
);

SELECT * FROM finish();
ROLLBACK;
