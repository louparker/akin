-- pgTAP tests for migration 0020: moderate_report()
--
-- Run: supabase test db
-- Prereqs: migrations 0001-0020 applied, seed.sql loaded.

BEGIN;
SELECT plan(14);

-- ── Helpers ──────────────────────────────────────────────────────────────────

-- Seed a minimal open report against seed post f01 (id: ...000f01).
INSERT INTO public.reports (id, reporter_id, target_type, target_id, reason, status)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001', -- alice
  'post',
  '00000000-0000-0000-0000-000000000f01', -- seed post f01
  'harassment',
  'open'
);

-- ── Test 1: non-moderator is rejected ────────────────────────────────────────
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"00000000-0000-0000-0000-000000000001"}';

SELECT throws_ok(
  $$ SELECT public.moderate_report(
       '10000000-0000-0000-0000-000000000001',
       'dismiss',
       'Not a violation.'
     ) $$,
  'P0401',
  'FORBIDDEN',
  'non-moderator cannot call moderate_report'
);

-- ── Elevate caller to moderator ───────────────────────────────────────────────
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'moderator')
ON CONFLICT DO NOTHING;

-- ── Test 2: empty reason is rejected ─────────────────────────────────────────
SELECT throws_ok(
  $$ SELECT public.moderate_report(
       '10000000-0000-0000-0000-000000000001',
       'dismiss',
       '   '
     ) $$,
  'P0400',
  'REASON_REQUIRED',
  'empty reason raises REASON_REQUIRED'
);

-- ── Test 3: invalid action is rejected ───────────────────────────────────────
SELECT throws_ok(
  $$ SELECT public.moderate_report(
       '10000000-0000-0000-0000-000000000001',
       'teleport',
       'Valid reason'
     ) $$,
  'P0400',
  'INVALID_ACTION',
  'unknown action raises INVALID_ACTION'
);

-- ── Test 4: dismiss sets report status = dismissed ───────────────────────────
SELECT lives_ok(
  $$ SELECT public.moderate_report(
       '10000000-0000-0000-0000-000000000001',
       'dismiss',
       'Not a violation.'
     ) $$,
  'dismiss succeeds'
);

SELECT is(
  (SELECT status FROM public.reports WHERE id = '10000000-0000-0000-0000-000000000001'),
  'dismissed',
  'report status is dismissed after dismiss action'
);

-- ── Test 5: dismiss writes an audit log row ───────────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.audit_log
    WHERE action = 'report.dismissed'
      AND metadata->>'report_id' = '10000000-0000-0000-0000-000000000001'),
  1,
  'audit log row written for dismiss'
);

-- ── Seed a second report for warn/suspend/ban tests ──────────────────────────
INSERT INTO public.reports (id, reporter_id, target_type, target_id, reason, status)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'post',
  '00000000-0000-0000-0000-000000000f01',
  'harassment',
  'open'
);

-- ── Test 6: warn increments strike_count ─────────────────────────────────────
DO $$ BEGIN
  UPDATE public.profiles SET strike_count = 0
   WHERE user_id = (SELECT author_id FROM public.posts WHERE id = '00000000-0000-0000-0000-000000000f01');
END $$;

SELECT lives_ok(
  $$ SELECT public.moderate_report(
       '10000000-0000-0000-0000-000000000002',
       'warn',
       'First warning.'
     ) $$,
  'warn succeeds'
);

SELECT is(
  (SELECT strike_count FROM public.profiles
    WHERE user_id = (SELECT author_id FROM public.posts WHERE id = '00000000-0000-0000-0000-000000000f01')),
  1,
  'strike_count incremented to 1 after warn'
);

-- ── Seed a third report for suspend test ─────────────────────────────────────
INSERT INTO public.reports (id, reporter_id, target_type, target_id, reason, status)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'post',
  '00000000-0000-0000-0000-000000000f01',
  'harassment',
  'open'
);

-- ── Test 7: suspend sets profile status = suspended ───────────────────────────
SELECT lives_ok(
  $$ SELECT public.moderate_report(
       '10000000-0000-0000-0000-000000000003',
       'suspend',
       'Repeated violations.'
     ) $$,
  'suspend succeeds'
);

SELECT is(
  (SELECT status FROM public.profiles
    WHERE user_id = (SELECT author_id FROM public.posts WHERE id = '00000000-0000-0000-0000-000000000f01')),
  'suspended',
  'profile status is suspended after suspend action'
);

SELECT ok(
  (SELECT suspended_until > now() FROM public.profiles
    WHERE user_id = (SELECT author_id FROM public.posts WHERE id = '00000000-0000-0000-0000-000000000f01')),
  'suspended_until is in the future'
);

-- ── Seed a fourth report for ban test (against a comment) ────────────────────
INSERT INTO public.reports (id, reporter_id, target_type, target_id, reason, status)
VALUES (
  '10000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'user',
  '00000000-0000-0000-0000-000000000005', -- eve (seed user 005)
  'hate',
  'open'
);

-- ── Test 8: ban sets profile status = banned ──────────────────────────────────
SELECT lives_ok(
  $$ SELECT public.moderate_report(
       '10000000-0000-0000-0000-000000000004',
       'ban',
       'Permanent ban for hate speech.'
     ) $$,
  'ban succeeds'
);

SELECT is(
  (SELECT status FROM public.profiles WHERE user_id = '00000000-0000-0000-0000-000000000005'),
  'banned',
  'profile status is banned after ban action'
);

-- ── Test 9: report not found raises P0404 ────────────────────────────────────
SELECT throws_ok(
  $$ SELECT public.moderate_report(
       'ffffffff-ffff-ffff-ffff-ffffffffffff',
       'dismiss',
       'Valid reason.'
     ) $$,
  'P0404',
  'REPORT_NOT_FOUND',
  'non-existent report raises REPORT_NOT_FOUND'
);

SELECT * FROM finish();
ROLLBACK;
