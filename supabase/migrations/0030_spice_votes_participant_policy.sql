-- Migration: 0030_spice_votes_participant_policy.sql
-- Spice votes are limited to active participants in active posts.
-- Participants are the OP row inserted by add_op_as_participant plus users
-- admitted by commenting.
--
-- Rollback:
--   DROP POLICY IF EXISTS "participants vote on active posts" ON public.spice_votes;
--   DROP POLICY IF EXISTS "participants update own spice vote" ON public.spice_votes;
--   DROP FUNCTION IF EXISTS public.is_active_post_participant(uuid);
--   -- Restore the 0006 policies if returning to the older non-participant rule.

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
      JOIN public.post_participants pp
        ON pp.post_id = p.id
     WHERE p.id = p_post_id
       AND p.status = 'active'
       AND pp.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_active_post_participant(uuid) IS
  'True when the current authenticated user is a participant in the active post. '
  'SECURITY DEFINER lets RLS policies check participant membership without '
  'granting direct post_participants reads.';

REVOKE ALL ON FUNCTION public.is_active_post_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_post_participant(uuid) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "users vote on others posts" ON public.spice_votes;
DROP POLICY IF EXISTS "users update own spice vote" ON public.spice_votes;

CREATE POLICY "participants vote on active posts"
  ON public.spice_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_active_post_participant(spice_votes.post_id)
  );

CREATE POLICY "participants update own spice vote"
  ON public.spice_votes FOR UPDATE
  USING (
    user_id = auth.uid()
    AND public.is_active_post_participant(spice_votes.post_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_active_post_participant(spice_votes.post_id)
  );
