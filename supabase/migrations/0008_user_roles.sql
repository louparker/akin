-- Migration: 0009_user_roles.sql
-- Moderator role infrastructure.
-- CRITICAL-PATH: auth + moderation
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.is_moderator();
--   DROP TABLE    IF EXISTS public.user_roles;

CREATE TABLE public.user_roles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('moderator', 'admin')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- is_moderator() — defined before policies so they can reference it.
-- SECURITY DEFINER: reads user_roles bypassing RLS.
-- SET search_path: prevents schema-confusion attacks.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('moderator', 'admin')
  );
$$;

-- Users can see their own role (e.g. to show moderator badge in UI)
CREATE POLICY "users see own role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Moderators can see all roles (for the dashboard)
CREATE POLICY "moderators see all roles"
  ON public.user_roles FOR SELECT
  USING (is_moderator());

-- No INSERT / UPDATE / DELETE policies: only service_role can manage roles.
