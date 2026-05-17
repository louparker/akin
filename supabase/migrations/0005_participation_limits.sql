-- Migration: 0005_participation_limits.sql
-- CRITICAL-PATH: limits
-- The participation-limit triggers. Every invariant in ARCHITECTURE.md §4
-- is enforced here. Do not modify without pgTAP tests and expert review.
--
-- Invariants enforced:
--   1. A post has at most 4 participants (1 OP + 3 unique commenters).
--   2. A user is active in at most 3 not-yet-full posts simultaneously.
--   3. A user creating a post while already active in 3 posts is rejected.
--
-- Error codes:
--   P0001 INSUFFICIENT_PARTICIPANT_SLOTS  — post is full
--   P0002 POST_NOT_FOUND                 — post row missing
--   P0003 USER_ACTIVE_LIMIT_REACHED      — user at 3 active posts
--
-- Rollback:
--   DROP TRIGGER  IF EXISTS enforce_participation_limits_trg ON public.comments;
--   DROP TRIGGER  IF EXISTS decrement_active_on_full_trg     ON public.posts;
--   DROP TRIGGER  IF EXISTS add_op_as_participant_trg         ON public.posts;
--   DROP TRIGGER  IF EXISTS enforce_post_creation_limit_trg  ON public.posts;
--   DROP FUNCTION IF EXISTS public.enforce_participation_limits();
--   DROP FUNCTION IF EXISTS public.decrement_active_on_full();
--   DROP FUNCTION IF EXISTS public.add_op_as_participant();
--   DROP FUNCTION IF EXISTS public.enforce_post_creation_limit();

-- ---------------------------------------------------------------------------
-- Function: enforce_participation_limits
-- Runs BEFORE INSERT on comments.
-- Uses SELECT ... FOR UPDATE on both the post row (to prevent concurrent
-- slot races) and the profile row (to prevent concurrent active-count races).
-- Lock order is always: posts → profiles, to prevent deadlocks.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_participation_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_full       boolean;
  v_post_author     uuid;
  v_already_in      boolean;
  v_active_count    int;
BEGIN
  -- Lock the post row. Serializes concurrent comment inserts for this post.
  SELECT is_full, author_id
    INTO v_post_full, v_post_author
    FROM public.posts
    WHERE id = NEW.post_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- OP commenting on own post: already a participant, no count changes needed.
  IF NEW.author_id = v_post_author THEN
    RETURN NEW;
  END IF;

  -- Check if this user is already a participant in this post.
  SELECT EXISTS (
    SELECT 1 FROM public.post_participants
     WHERE post_id = NEW.post_id AND user_id = NEW.author_id
  ) INTO v_already_in;

  IF v_already_in THEN
    -- Repeat commenter: already admitted, counts unchanged. Allow.
    RETURN NEW;
  END IF;

  -- New commenter: check if post has room.
  IF v_post_full THEN
    RAISE EXCEPTION 'INSUFFICIENT_PARTICIPANT_SLOTS' USING ERRCODE = 'P0001';
  END IF;

  -- Lock the commenter's profile row to check (and update) active_post_count.
  SELECT active_post_count
    INTO v_active_count
    FROM public.profiles
    WHERE user_id = NEW.author_id
    FOR UPDATE;

  IF v_active_count >= 3 THEN
    RAISE EXCEPTION 'USER_ACTIVE_LIMIT_REACHED' USING ERRCODE = 'P0003';
  END IF;

  -- Admit the new participant.
  -- IMPORTANT: increment active_post_count BEFORE updating participant_count.
  -- The participant_count UPDATE fires decrement_active_on_full (AFTER UPDATE).
  -- If that trigger fires before this increment, the new participant hits 0→-1.
  INSERT INTO public.post_participants (post_id, user_id)
    VALUES (NEW.post_id, NEW.author_id);

  UPDATE public.profiles
     SET active_post_count = active_post_count + 1
   WHERE user_id = NEW.author_id;

  UPDATE public.posts
     SET participant_count = participant_count + 1
   WHERE id = NEW.post_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_participation_limits_trg
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_participation_limits();

-- ---------------------------------------------------------------------------
-- Function: decrement_active_on_full
-- Runs AFTER UPDATE OF participant_count on posts.
-- When participant_count reaches 4 (post fills), all participants get their
-- active_post_count decremented — they have a free slot again.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.decrement_active_on_full()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.participant_count = 4 AND OLD.participant_count < 4 THEN
    UPDATE public.profiles
       SET active_post_count = active_post_count - 1
     WHERE user_id IN (
       SELECT user_id FROM public.post_participants
        WHERE post_id = NEW.id
     );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER decrement_active_on_full_trg
  AFTER UPDATE OF participant_count ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_active_on_full();

-- ---------------------------------------------------------------------------
-- Function: add_op_as_participant
-- Runs AFTER INSERT on posts.
-- Initialises the OP as participant #1 and increments their active count.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.add_op_as_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.post_participants (post_id, user_id)
    VALUES (NEW.id, NEW.author_id);

  UPDATE public.profiles
     SET active_post_count = active_post_count + 1
   WHERE user_id = NEW.author_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER add_op_as_participant_trg
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.add_op_as_participant();

-- ---------------------------------------------------------------------------
-- Function: enforce_post_creation_limit
-- Runs BEFORE INSERT on posts.
-- Rejects the insert if the author's active_post_count is already 3.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_post_creation_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active int;
BEGIN
  SELECT active_post_count INTO v_active
    FROM public.profiles
   WHERE user_id = NEW.author_id
   FOR UPDATE;

  IF v_active >= 3 THEN
    RAISE EXCEPTION 'USER_ACTIVE_LIMIT_REACHED' USING ERRCODE = 'P0003';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_post_creation_limit_trg
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_post_creation_limit();
