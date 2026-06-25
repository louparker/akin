-- Migration: 0031_spice_votes_comment_participants.sql
-- Treat active visible comments as participant evidence for spice voting.
-- This keeps OP/commenter voting aligned with the product rule even if older
-- or drifted data has comments without matching post_participants rows.
--
-- Rollback:
--   DROP INDEX IF EXISTS comments_active_author_post_idx;
--   Recreate public.is_active_post_participant(uuid) from 0030.

CREATE INDEX IF NOT EXISTS comments_active_author_post_idx
  ON public.comments (post_id, author_id)
  WHERE status = 'active' AND removed_by_op = false;

CREATE OR REPLACE FUNCTION public.is_active_post_participant(p_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.posts p
     WHERE p.id = p_post_id
       AND p.status = 'active'
       AND p.author_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
      FROM public.posts p
      JOIN public.post_participants pp
        ON pp.post_id = p.id
     WHERE p.id = p_post_id
       AND p.status = 'active'
       AND pp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
      FROM public.posts p
      JOIN public.comments c
        ON c.post_id = p.id
     WHERE p.id = p_post_id
       AND p.status = 'active'
       AND c.author_id = auth.uid()
       AND c.status = 'active'
       AND c.removed_by_op = false
  );
$$;

COMMENT ON FUNCTION public.is_active_post_participant(uuid) IS
  'True when the current authenticated user is the OP, is in the participant '
  'ledger, or has an active visible comment on the active post. SECURITY '
  'DEFINER lets RLS policies check participation without exposing participant '
  'or comment rows.';

REVOKE ALL ON FUNCTION public.is_active_post_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_post_participant(uuid) TO authenticated, anon, service_role;
