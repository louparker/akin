-- Migration: 0006_spice_votes.sql
-- Spice-vote table. Users rate a post 1-5 exactly once.
-- Average is denormalised on the post via trigger.
--
-- Rollback:
--   DROP TRIGGER  IF EXISTS spice_vote_maintain_averages_trg ON public.spice_votes;
--   DROP FUNCTION IF EXISTS public.maintain_spice_averages();
--   DROP TABLE    IF EXISTS public.spice_votes;

CREATE TABLE public.spice_votes (
  post_id    uuid NOT NULL REFERENCES public.posts(id)  ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  score      int  NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX spice_votes_user_idx ON public.spice_votes (user_id);

ALTER TABLE public.spice_votes ENABLE ROW LEVEL SECURITY;

-- Own vote readable
CREATE POLICY "users read own spice vote"
  ON public.spice_votes FOR SELECT
  USING (user_id = auth.uid());

-- Insert: cannot vote on own post
CREATE POLICY "users vote on others posts"
  ON public.spice_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.posts p
       WHERE p.id = post_id AND p.status = 'active'
         AND p.author_id <> auth.uid()
    )
  );

-- Update own vote (change of mind)
CREATE POLICY "users update own spice vote"
  ON public.spice_votes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Retract vote
CREATE POLICY "users delete own spice vote"
  ON public.spice_votes FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Trigger: keep posts.total_spice_score + spice_vote_count in sync
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.maintain_spice_averages()
RETURNS trigger
LANGUAGE plpgsql
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

CREATE TRIGGER spice_vote_maintain_averages_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.spice_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_spice_averages();
