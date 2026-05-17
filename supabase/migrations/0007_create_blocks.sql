-- Migration: 0007_create_blocks.sql
-- Blocks table + updated block-aware RLS on posts and comments.
-- After this migration, blocked users' content disappears bidirectionally.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.blocks;
--   -- Restore original posts/comments SELECT policies (remove NOT EXISTS clause)

CREATE TABLE public.blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- Reverse-direction lookup for the bidirectional NOT EXISTS check
CREATE INDEX blocks_blocked_id_idx ON public.blocks (blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own blocks"
  ON public.blocks FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "users insert own blocks"
  ON public.blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "users delete own blocks"
  ON public.blocks FOR DELETE
  USING (blocker_id = auth.uid());

-- No UPDATE policy: blocks cannot be modified, only deleted and recreated.

-- ---------------------------------------------------------------------------
-- Replace posts SELECT policy with block-aware version
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "anyone reads active posts" ON public.posts;

CREATE POLICY "anyone reads active posts (block-aware)"
  ON public.posts FOR SELECT
  USING (
    status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks
       WHERE (blocker_id = auth.uid() AND blocked_id = posts.author_id)
          OR (blocker_id = posts.author_id AND blocked_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Replace comments SELECT policy with block-aware version
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "anyone reads active comments" ON public.comments;

CREATE POLICY "anyone reads active comments (block-aware)"
  ON public.comments FOR SELECT
  USING (
    status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks
       WHERE (blocker_id = auth.uid() AND blocked_id = comments.author_id)
          OR (blocker_id = comments.author_id AND blocked_id = auth.uid())
    )
  );
