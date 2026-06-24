-- Migration: 0028_free_slot_on_comment_delete.sql
-- CRITICAL-PATH: limits
--
-- "Leave the conversation" on comment delete. Before this migration, a non-OP
-- commenter who soft-deleted their comment kept their seat AND their elevated
-- active_post_count, so they stayed counted as active in a post they were no
-- longer part of. Deleting a *post* as OP already frees slots (0026); this is
-- the commenter-side equivalent.
--
-- Behaviour (mirrors apply_op_participant_removal Case A, 0017):
--   When a participant soft-deletes their LAST active comment on a still-open
--   (not-full) post, and they are not the OP, they leave the conversation:
--     * removed from post_participants,
--     * posts.participant_count decremented (the generated is_full flips false,
--       so the freed seat reopens for a new commenter),
--     * their active_post_count decremented (GREATEST(x-1, 0)).
--   They are NOT added to post_participant_removals, so they may re-join later
--   if they choose (a fresh comment re-admits them via enforce_participation_limits).
--
-- Deliberately scoped to NOT-full posts (participant_count < 4), exactly like
-- free_slots_on_post_delete (0026): a full post already returned everyone's slot
-- when it filled (decrement_active_on_full, 0005). Un-filling it here would
-- reopen a seat and, on the next join, re-fire decrement_active_on_full and
-- double-count. Leaving full posts untouched avoids that entirely.
--
-- Only the author's LAST active comment triggers the leave; deleting one of
-- several comments leaves them a participant.
--
-- SECURITY DEFINER so the participant_count UPDATE bypasses the authenticated
-- column guard (enforce_post_update_columns) the same way 0005/0017 do, and so
-- the leaver's profile can be updated regardless of the deleter's RLS.
--
-- Rollback:
--   DROP TRIGGER  IF EXISTS free_slot_on_last_comment_delete_trg ON public.comments;
--   DROP FUNCTION IF EXISTS public.free_slot_on_last_comment_delete();

CREATE OR REPLACE FUNCTION public.free_slot_on_last_comment_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author       uuid;
  v_participant_count int;
  v_remaining         int;
BEGIN
  -- Only the active→deleted soft-delete transition matters.
  IF NOT (OLD.status = 'active' AND NEW.status = 'deleted') THEN
    RETURN NEW;
  END IF;

  -- Lock the post row to serialize against concurrent comment inserts (someone
  -- joining) and other leaves on the same post. Lock order posts→profiles
  -- matches enforce_participation_limits to avoid deadlocks.
  SELECT author_id, participant_count
    INTO v_post_author, v_participant_count
    FROM public.posts
   WHERE id = NEW.post_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW; -- post is gone; nothing to reconcile
  END IF;

  -- The OP always remains a participant of their own post. OP leaving happens
  -- via post delete (0026), never via deleting a comment.
  IF NEW.author_id = v_post_author THEN
    RETURN NEW;
  END IF;

  -- Scoped to open posts only. A full post already returned every slot when it
  -- filled; do not un-fill it (see header note).
  IF v_participant_count >= 4 THEN
    RETURN NEW;
  END IF;

  -- Only act when this was the author's LAST active comment — otherwise they
  -- are still participating. The just-deleted row already reads as 'deleted'
  -- in this AFTER trigger, so it is excluded from this count.
  SELECT count(*)
    INTO v_remaining
    FROM public.comments
   WHERE post_id = NEW.post_id
     AND author_id = NEW.author_id
     AND status = 'active';

  IF v_remaining > 0 THEN
    RETURN NEW;
  END IF;

  -- Defensive: only act if they are actually a seated participant.
  IF NOT EXISTS (
    SELECT 1 FROM public.post_participants
     WHERE post_id = NEW.post_id AND user_id = NEW.author_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Leave the conversation: vacate the seat and free the active slot.
  DELETE FROM public.post_participants
   WHERE post_id = NEW.post_id AND user_id = NEW.author_id;

  UPDATE public.posts
     SET participant_count = participant_count - 1
   WHERE id = NEW.post_id;

  UPDATE public.profiles
     SET active_post_count = GREATEST(active_post_count - 1, 0)
   WHERE user_id = NEW.author_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER free_slot_on_last_comment_delete_trg
  AFTER UPDATE OF status ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.free_slot_on_last_comment_delete();
