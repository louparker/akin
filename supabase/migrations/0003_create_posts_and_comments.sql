-- Migration: 0003_create_posts_and_comments.sql
-- Core content tables: posts, post_participants, comments.
-- Participation-limit triggers come in 0005. Edit-window policies in 0004.
-- Block-aware RLS policies added/updated in 0007 once the blocks table exists.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.comments;
--   DROP TABLE IF EXISTS public.post_participants;
--   DROP TABLE IF EXISTS public.posts;
--   DROP TYPE  IF EXISTS public.post_category;
--   DROP TYPE  IF EXISTS public.content_language;
--   DROP TYPE  IF EXISTS public.content_status;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

CREATE TYPE public.post_category AS ENUM (
  'vent_space',
  'all_the_feels',
  'advice_needed',
  'just_wondering',
  'story_time',
  'decode_this',
  'aitoo',
  'hypothetically',
  'good_vibes'
);

CREATE TYPE public.content_language AS ENUM ('sv', 'en');

CREATE TYPE public.content_status AS ENUM ('active', 'hidden', 'deleted');

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------

CREATE TABLE public.posts (
  id                  uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id           uuid              NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  author_identifier   text              NOT NULL,
  title               text              NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
  body                text              NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  category            public.post_category NOT NULL,
  language            public.content_language NOT NULL DEFAULT 'sv',
  comment_count       int               NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  participant_count   int               NOT NULL DEFAULT 1 CHECK (participant_count BETWEEN 1 AND 4),
  is_full             boolean           NOT NULL GENERATED ALWAYS AS (participant_count >= 4) STORED,
  total_spice_score   int               NOT NULL DEFAULT 0 CHECK (total_spice_score >= 0),
  spice_vote_count    int               NOT NULL DEFAULT 0 CHECK (spice_vote_count >= 0),
  average_spice_level numeric(3,2)      GENERATED ALWAYS AS (
    CASE WHEN spice_vote_count = 0 THEN NULL
         ELSE ROUND(total_spice_score::numeric / spice_vote_count, 2)
    END
  ) STORED,
  view_count          int               NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  status              public.content_status NOT NULL DEFAULT 'active',
  created_at          timestamptz       NOT NULL DEFAULT now(),
  updated_at          timestamptz       NOT NULL DEFAULT now()
);

-- Feed indexes
CREATE INDEX posts_feed_recent_idx
  ON public.posts (created_at DESC)
  WHERE status = 'active';

CREATE INDEX posts_category_recent_idx
  ON public.posts (category, created_at DESC)
  WHERE status = 'active';

CREATE INDEX posts_comment_count_idx
  ON public.posts (comment_count DESC)
  WHERE status = 'active';

CREATE INDEX posts_spice_idx
  ON public.posts (average_spice_level DESC NULLS LAST)
  WHERE status = 'active';

-- FK covering index
CREATE INDEX posts_author_id_idx ON public.posts (author_id);

-- ---------------------------------------------------------------------------
-- post_participants
-- ---------------------------------------------------------------------------

CREATE TABLE public.post_participants (
  post_id    uuid        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Used by the participation-limit trigger and active-count queries.
CREATE INDEX post_participants_user_idx ON public.post_participants (user_id);

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

CREATE TABLE public.comments (
  id                uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid              NOT NULL REFERENCES public.posts(id)  ON DELETE CASCADE,
  author_id         uuid              NOT NULL REFERENCES auth.users(id)    ON DELETE RESTRICT,
  author_identifier text              NOT NULL,
  body              text              NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  status            public.content_status NOT NULL DEFAULT 'active',
  created_at        timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX comments_post_id_idx ON public.comments (post_id, created_at ASC);
CREATE INDEX comments_author_id_idx ON public.comments (author_id);

-- ---------------------------------------------------------------------------
-- RLS — posts
-- ---------------------------------------------------------------------------

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Public read of active posts (block-aware policy added in 0007).
CREATE POLICY "anyone reads active posts"
  ON public.posts FOR SELECT
  USING (status = 'active');

-- Insert: must be authenticated, email confirmed, age verified, profile active.
CREATE POLICY "verified users create posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.email_confirmed_at IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.age_verified_at IS NOT NULL
        AND p.status = 'active'
    )
  );

-- Soft-delete only (status → 'deleted'). Hard delete not allowed via client.
CREATE POLICY "authors soft-delete own posts"
  ON public.posts FOR DELETE
  USING (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS — post_participants
-- ---------------------------------------------------------------------------

ALTER TABLE public.post_participants ENABLE ROW LEVEL SECURITY;

-- Only participants of a post can see its participant list.
CREATE POLICY "participants view own post's participant list"
  ON public.post_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.post_participants pp2
      WHERE pp2.post_id = post_participants.post_id
        AND pp2.user_id = auth.uid()
    )
  );

-- Inserts managed exclusively by triggers — no client INSERT policy.
-- Deletes managed exclusively by cascades — no client DELETE policy.

-- ---------------------------------------------------------------------------
-- RLS — comments
-- ---------------------------------------------------------------------------

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Public read of active comments (block-aware policy added in 0007).
CREATE POLICY "anyone reads active comments"
  ON public.comments FOR SELECT
  USING (status = 'active');

-- Insert: same verification checks as posts.
CREATE POLICY "verified users create comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.email_confirmed_at IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.age_verified_at IS NOT NULL
        AND p.status = 'active'
    )
  );

-- Soft-delete only.
CREATE POLICY "authors soft-delete own comments"
  ON public.comments FOR DELETE
  USING (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Trigger: keep updated_at current on posts
-- ---------------------------------------------------------------------------

CREATE TRIGGER posts_set_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: increment / decrement comment_count on posts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.maintain_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status <> 'active' THEN
      UPDATE public.posts SET comment_count = comment_count - 1 WHERE id = NEW.post_id;
    ELSIF OLD.status <> 'active' AND NEW.status = 'active' THEN
      UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER comments_maintain_count
  AFTER INSERT OR UPDATE OF status ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_comment_count();
