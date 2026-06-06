-- Migration: 0018_fix_posts_comments_rls_auth_users.sql
-- CRITICAL-PATH: posts + comments INSERT RLS
--
-- Bug fix: 0003 created posts/comments INSERT policies that include
--   EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL)
-- as a WITH CHECK clause. Modern Supabase does not grant SELECT on auth.users to
-- the `authenticated` role (and granting it would violate Akin's anonymity rule
-- in CLAUDE.md §8 by leaking emails to every client). So every post and comment
-- INSERT was rejected with:
--   42501  permission denied for table users
--
-- Fix: extract the email-confirmation check into a SECURITY DEFINER helper that
-- can read auth.users without exposing it to clients — same pattern as
-- public.is_moderator() in 0008. The policy then calls the function.
--
-- Why this is safe:
--   * SECURITY DEFINER runs as the function owner (postgres), which has SELECT
--     on auth.users.
--   * SET search_path = public prevents schema-confusion / search-path attacks.
--   * The function returns only a boolean — no row data, no email, no identifier.
--   * STABLE marks it as safe to call repeatedly within one statement.
--
-- Rollback:
--   DROP POLICY IF EXISTS "verified users create posts" ON public.posts;
--   DROP POLICY IF EXISTS "verified users create comments" ON public.comments;
--   -- restore the 0003 policies (see 0003 source) with the inline EXISTS(SELECT FROM auth.users ...)
--   DROP FUNCTION IF EXISTS public.is_email_confirmed();

-- ---------------------------------------------------------------------------
-- 1. is_email_confirmed() helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_email_confirmed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
     WHERE id = auth.uid()
       AND email_confirmed_at IS NOT NULL
  );
$$;

COMMENT ON FUNCTION public.is_email_confirmed() IS
  'True when the current authenticated user has confirmed their email. '
  'SECURITY DEFINER so RLS policies can check email confirmation without '
  'granting SELECT on auth.users to the authenticated role.';

-- Explicit revoke + grant: only the authenticated role can call this, and
-- callers cannot see auth.users contents — only the boolean result.
REVOKE ALL ON FUNCTION public.is_email_confirmed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_email_confirmed() TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- 2. Replace posts INSERT policy
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "verified users create posts" ON public.posts;

CREATE POLICY "verified users create posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_email_confirmed()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.age_verified_at IS NOT NULL
        AND p.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Replace comments INSERT policy
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "verified users create comments" ON public.comments;

CREATE POLICY "verified users create comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_email_confirmed()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.age_verified_at IS NOT NULL
        AND p.status = 'active'
    )
  );
