-- Migration: 0029_spice_averages_security_definer.sql
-- Fix spice vote aggregate updates under RLS.
--
-- Regression: authenticated users can insert/update their own spice_votes, but
-- the AFTER trigger then updates public.posts.average inputs
-- (total_spice_score, spice_vote_count). Voters are not post authors, so the
-- trigger must run as a SECURITY DEFINER helper to bypass posts UPDATE RLS and
-- the authenticated column guard, matching the other denormalised counters.
--
-- Rollback:
--   Recreate public.maintain_spice_averages() without SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.maintain_spice_averages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
       SET total_spice_score = total_spice_score + NEW.score,
           spice_vote_count  = spice_vote_count + 1
     WHERE id = NEW.post_id;

  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.posts
       SET total_spice_score = total_spice_score - OLD.score + NEW.score
     WHERE id = NEW.post_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
       SET total_spice_score = total_spice_score - OLD.score,
           spice_vote_count  = spice_vote_count - 1
     WHERE id = OLD.post_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
