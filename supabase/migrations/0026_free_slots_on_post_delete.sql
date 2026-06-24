-- Migration: 0026_free_slots_on_post_delete.sql
-- CRITICAL-PATH: limits
--
-- When the OP soft-deletes a post, the conversation is gone, so every participant
-- who was still "active" in it should get their slot back. Before this migration,
-- active_post_count stayed elevated after a delete, so the OP could be stuck below
-- their 3-post allowance with deleted posts still counting against them.
--
-- Interaction with decrement_active_on_full (0005): a *full* post (4 participants)
-- has already returned everyone's slot when it filled, so we must NOT decrement
-- again for full posts. We therefore only act when participant_count < 4.
--
-- Mirrors the existing pattern: SECURITY DEFINER so it can update every
-- participant's profile regardless of the deleter's RLS.
--
-- Rollback:
--   DROP TRIGGER  IF EXISTS free_slots_on_post_delete_trg ON public.posts;
--   DROP FUNCTION IF EXISTS public.free_slots_on_post_delete();

CREATE OR REPLACE FUNCTION public.free_slots_on_post_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only on the active→deleted soft-delete, and only while the post was still
  -- open (not full). A full post already freed everyone via decrement_active_on_full.
  IF OLD.status = 'active'
     AND NEW.status = 'deleted'
     AND NEW.participant_count < 4 THEN
    UPDATE public.profiles
       SET active_post_count = GREATEST(active_post_count - 1, 0)
     WHERE user_id IN (
       SELECT user_id FROM public.post_participants WHERE post_id = NEW.id
     );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER free_slots_on_post_delete_trg
  AFTER UPDATE OF status ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.free_slots_on_post_delete();
