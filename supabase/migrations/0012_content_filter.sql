-- Migration: 0012_content_filter.sql
-- Server-side keyword content filter for posts and comments.
-- Rejects content containing slurs or contact information.
--
-- Error codes:
--   P0010  CONTENT_FILTER_HIT       — slur/banned word detected
--   P0011  CONTACT_INFO_NOT_ALLOWED — phone, email, or social handle detected
--
-- Rollback:
--   DROP TRIGGER  IF EXISTS check_post_content_trg    ON public.posts;
--   DROP TRIGGER  IF EXISTS check_comment_content_trg ON public.comments;
--   DROP FUNCTION IF EXISTS public.check_content_filter(text);
--   DROP FUNCTION IF EXISTS public.run_content_filter();
--   DROP TABLE    IF EXISTS public.filter_words;
--   DROP TYPE     IF EXISTS public.filter_word_kind;
--
-- TODO i18n review: slur list must be reviewed by founder before production.
-- The contact-info regexes are safe to ship as-is.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

CREATE TYPE public.filter_word_kind AS ENUM ('slur', 'spam_pattern');

CREATE TABLE public.filter_words (
  id       bigserial              PRIMARY KEY,
  word     text                   NOT NULL UNIQUE,
  kind     public.filter_word_kind NOT NULL,
  language text                   NOT NULL CHECK (language IN ('sv', 'en', 'both')),
  active   boolean                NOT NULL DEFAULT true
);

CREATE INDEX filter_words_active_idx
  ON public.filter_words (kind, language, active)
  WHERE active = true;

ALTER TABLE public.filter_words ENABLE ROW LEVEL SECURITY;

-- Service-role only — filter list is not exposed to clients.
-- No SELECT policy → default deny. Moderators use the dashboard (service-role).

-- ---------------------------------------------------------------------------
-- Filter function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_content_filter(p_content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lower text := lower(p_content);
  v_word  text;
BEGIN
  -- 1. Slur check (case-insensitive word-boundary regex match).
  -- \m and \M are PostgreSQL regex word-boundary anchors.
  -- Using regex prevents false positives like 'spic' matching 'spice'.
  FOR v_word IN
    SELECT word FROM public.filter_words
     WHERE kind = 'slur' AND active = true
  LOOP
    IF v_lower ~ ('\m' || lower(v_word) || '\M') THEN
      RAISE EXCEPTION 'CONTENT_FILTER_HIT' USING ERRCODE = 'P0010';
    END IF;
  END LOOP;

  -- 2. Contact information patterns (phone, email, social handles)
  --    These are intentionally broad — Akin does not allow off-platform contact.

  -- Phone numbers: 6+ consecutive digits (covers most formats with spaces/dashes)
  IF p_content ~ '\d[\d\s\-\.\(\)]{5,}\d' THEN
    RAISE EXCEPTION 'CONTACT_INFO_NOT_ALLOWED' USING ERRCODE = 'P0011';
  END IF;

  -- Email addresses
  IF p_content ~* '[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}' THEN
    RAISE EXCEPTION 'CONTACT_INFO_NOT_ALLOWED' USING ERRCODE = 'P0011';
  END IF;

  -- Social handle patterns (snapchat, instagram, telegram, discord, etc.)
  IF p_content ~* '(snapchat|instagram|insta|snap|telegram|tele|discord|whatsapp|signal|kik|line)\s*[:\-@]?\s*[a-z0-9._]{2,}' THEN
    RAISE EXCEPTION 'CONTACT_INFO_NOT_ALLOWED' USING ERRCODE = 'P0011';
  END IF;

  -- Bare @handle pattern (username mentions)
  IF p_content ~ '@[a-zA-Z0-9_.]{3,}' THEN
    RAISE EXCEPTION 'CONTACT_INFO_NOT_ALLOWED' USING ERRCODE = 'P0011';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger wrapper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_content_filter()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check title if present (posts only)
  IF TG_TABLE_NAME = 'posts' THEN
    PERFORM public.check_content_filter(NEW.title);
  END IF;
  PERFORM public.check_content_filter(NEW.body);
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_post_content_trg
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.run_content_filter();

CREATE TRIGGER check_comment_content_trg
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.run_content_filter();

-- ---------------------------------------------------------------------------
-- Seed: starter slur list (bilingual, conservative)
-- TODO i18n review: Swedish entries must be reviewed by native speaker.
-- TODO i18n review: English entries must be reviewed by founder.
-- Production deployment requires explicit sign-off on each entry.
-- ---------------------------------------------------------------------------

INSERT INTO public.filter_words (word, kind, language) VALUES
  -- English slurs (placeholder entries — replace with reviewed list before production)
  -- Deliberately minimal and well-known to avoid false positives at this stage
  ('faggot',   'slur', 'en'),
  ('nigger',   'slur', 'en'),
  ('nigga',    'slur', 'en'),
  ('chink',    'slur', 'en'),
  ('kike',     'slur', 'en'),
  ('spic',     'slur', 'en'),
  ('wetback',  'slur', 'en'),
  ('tranny',   'slur', 'en'),
  ('retard',   'slur', 'en'),
  ('cunt',     'slur', 'en'),
  -- Swedish slurs (placeholder entries — MUST be reviewed by native speaker)
  ('fitta',    'slur', 'sv'),
  ('hora',     'slur', 'sv'),
  ('bög',      'slur', 'sv'),
  ('neger',    'slur', 'sv'),
  ('zigenare', 'slur', 'sv'),
  ('blatte',   'slur', 'sv');
