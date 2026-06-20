-- Migration: 0024_blocks_add_blocked_identifier.sql
-- Add a denormalised blocked_identifier column to blocks so the Settings
-- "Blocked users" list can display the anonymous identifier without joining
-- through profiles (which would risk leaking auth.users data via RLS).
--
-- A BEFORE INSERT trigger auto-populates the column from profiles so the app
-- never needs to look up the identifier itself; existing rows are backfilled
-- in this migration.

ALTER TABLE public.blocks
  ADD COLUMN IF NOT EXISTS blocked_identifier text;

-- Backfill existing rows.
UPDATE public.blocks b
   SET blocked_identifier = p.anonymous_identifier
  FROM public.profiles p
 WHERE p.user_id = b.blocked_id
   AND b.blocked_identifier IS NULL;

-- Trigger function: fires BEFORE INSERT, fills blocked_identifier from
-- profiles if the caller did not supply it explicitly.
CREATE OR REPLACE FUNCTION public.blocks_set_blocked_identifier()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.blocked_identifier IS NULL THEN
    SELECT anonymous_identifier
      INTO NEW.blocked_identifier
      FROM public.profiles
     WHERE user_id = NEW.blocked_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER blocks_set_blocked_identifier_trg
  BEFORE INSERT ON public.blocks
  FOR EACH ROW EXECUTE FUNCTION public.blocks_set_blocked_identifier();

-- All rows now have a value; enforce NOT NULL going forward.
ALTER TABLE public.blocks
  ALTER COLUMN blocked_identifier SET NOT NULL;
