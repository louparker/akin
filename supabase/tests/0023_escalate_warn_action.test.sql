-- pgTAP tests for migration 0023: warn action auto-escalation.
--
-- Run: supabase test db
-- Prereqs: migrations 0001-0023 applied, seed.sql loaded.
--
-- Covers Phase 7 Task 7.7 acceptance criteria:
--   strike 0 + warn → just warn (strike 1, status 'active')
--   strike 1 + warn → auto-suspend 7d (strike 2, status 'suspended')
--   strike 2 + warn → auto-ban (strike 3, status 'banned', content hidden)
--
-- Role discipline: the moderate_report call must run as the authenticated
-- moderator (so auth.uid() and is_moderator() resolve). The verification
-- queries against profiles must run as superuser, because once a profile
-- becomes suspended/banned the public-read RLS policy (USING status='active')
-- no longer matches and the caller is not the row owner.

BEGIN;
SELECT plan(13);

-- ── Superuser setup ─────────────────────────────────────────────────────────
-- Idempotent role grant + deterministic eve state, before any role swap.
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'moderator')
ON CONFLICT DO NOTHING;

UPDATE public.profiles
   SET strike_count = 0,
       status = 'active',
       suspended_until = NULL
 WHERE user_id = '00000000-0000-0000-0000-000000000005';

INSERT INTO public.reports (id, reporter_id, target_type, target_id, reason, status)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001', 'user',
   '00000000-0000-0000-0000-000000000005', 'harassment', 'open'),
  ('20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001', 'user',
   '00000000-0000-0000-0000-000000000005', 'harassment', 'open'),
  ('20000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001', 'user',
   '00000000-0000-0000-0000-000000000005', 'harassment', 'open');

-- ─────────────────────────────────────────────────────────────────────────────
-- First warn (strike 0 → 1, status stays 'active')
-- ─────────────────────────────────────────────────────────────────────────────
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"00000000-0000-0000-0000-000000000001"}';

SELECT lives_ok(
  $$ SELECT public.moderate_report(
       '20000000-0000-0000-0000-000000000001', 'warn', 'First warning.'
     ) $$,
  'first warn succeeds'
);

RESET role;

SELECT is(
  (SELECT strike_count FROM public.profiles
    WHERE user_id = '00000000-0000-0000-0000-000000000005'),
  1,
  'strike 0 + warn → strike 1'
);

SELECT is(
  (SELECT status::text FROM public.profiles
    WHERE user_id = '00000000-0000-0000-0000-000000000005'),
  'active',
  'first warn keeps status = active'
);

SELECT is(
  (SELECT count(*)::int FROM public.audit_log
    WHERE action = 'user.warned'
      AND metadata->>'report_id' = '20000000-0000-0000-0000-000000000001'),
  1,
  'first warn writes user.warned audit row'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Second warn at strike 1 → auto-suspend (strike 2, 7d)
-- ─────────────────────────────────────────────────────────────────────────────
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"00000000-0000-0000-0000-000000000001"}';

SELECT lives_ok(
  $$ SELECT public.moderate_report(
       '20000000-0000-0000-0000-000000000002', 'warn', 'Second warning.'
     ) $$,
  'second warn succeeds'
);

RESET role;

SELECT is(
  (SELECT strike_count FROM public.profiles
    WHERE user_id = '00000000-0000-0000-0000-000000000005'),
  2,
  'strike 1 + warn → strike 2'
);

SELECT is(
  (SELECT status::text FROM public.profiles
    WHERE user_id = '00000000-0000-0000-0000-000000000005'),
  'suspended',
  'second warn auto-escalates to status = suspended'
);

SELECT ok(
  (SELECT suspended_until > now() + interval '6 days'
     FROM public.profiles
    WHERE user_id = '00000000-0000-0000-0000-000000000005'),
  'suspended_until is ~7 days in the future'
);

SELECT is(
  (SELECT count(*)::int FROM public.audit_log
    WHERE action = 'user.suspended.auto'
      AND metadata->>'report_id' = '20000000-0000-0000-0000-000000000002'
      AND metadata->>'escalated_from' = 'warn'),
  1,
  'second warn writes user.suspended.auto audit row with escalated_from metadata'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Third warn at strike 2 → auto-ban (strike 3, content hidden)
-- ─────────────────────────────────────────────────────────────────────────────
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"00000000-0000-0000-0000-000000000001"}';

SELECT lives_ok(
  $$ SELECT public.moderate_report(
       '20000000-0000-0000-0000-000000000003', 'warn', 'Third warning.'
     ) $$,
  'third warn succeeds'
);

RESET role;

SELECT is(
  (SELECT strike_count FROM public.profiles
    WHERE user_id = '00000000-0000-0000-0000-000000000005'),
  3,
  'strike 2 + warn → strike 3'
);

SELECT is(
  (SELECT status::text FROM public.profiles
    WHERE user_id = '00000000-0000-0000-0000-000000000005'),
  'banned',
  'third warn auto-escalates to status = banned'
);

SELECT is(
  (SELECT count(*)::int FROM public.audit_log
    WHERE action = 'user.banned.auto'
      AND metadata->>'report_id' = '20000000-0000-0000-0000-000000000003'
      AND metadata->>'escalated_from' = 'warn'),
  1,
  'third warn writes user.banned.auto audit row with escalated_from metadata'
);

SELECT * FROM finish();
ROLLBACK;
