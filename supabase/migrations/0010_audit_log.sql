-- Migration: 0010_audit_log.sql
-- Append-only audit log. Entries are written by SECURITY DEFINER functions
-- inside other triggers and Edge Functions — never directly by the client.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.log_audit(uuid, text, text, uuid, jsonb);
--   DROP TABLE    IF EXISTS public.audit_log;

CREATE TABLE public.audit_log (
  id          bigserial   PRIMARY KEY,
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  target_type text        NOT NULL,
  target_id   uuid,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- "History of this thing" lookup (moderator detail view)
CREATE INDEX audit_log_target_idx
  ON public.audit_log (target_type, target_id, created_at DESC);

-- "What did this moderator do" lookup
CREATE INDEX audit_log_actor_idx
  ON public.audit_log (actor_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Moderators can read all entries; nobody else can.
CREATE POLICY "moderators read audit log"
  ON public.audit_log FOR SELECT
  USING (is_moderator());

-- No INSERT / UPDATE / DELETE policies for regular users.
-- Inserts go through log_audit() SECURITY DEFINER below.

-- ---------------------------------------------------------------------------
-- log_audit() — used by triggers and Edge Functions to write entries
-- SECURITY DEFINER so it can INSERT regardless of caller's RLS context.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_audit(
  p_actor_id    uuid,
  p_action      text,
  p_target_type text,
  p_target_id   uuid,
  p_metadata    jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (p_actor_id, p_action, p_target_type, p_target_id, p_metadata);
END;
$$;
