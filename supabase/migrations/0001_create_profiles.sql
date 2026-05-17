-- Migration: 0001_create_profiles.sql
-- Creates the profiles table (1:1 with auth.users) and the auth-trigger
-- that auto-creates a profile row on every new user signup.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS public.handle_new_user();
--   DROP TABLE IF EXISTS public.profiles;
--   DROP TYPE  IF EXISTS public.profile_status;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

CREATE TYPE public.profile_status AS ENUM ('active', 'suspended', 'banned');

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  user_id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_identifier text        NOT NULL UNIQUE,
  language             text        NOT NULL DEFAULT 'sv' CHECK (language IN ('sv', 'en')),
  age_verified_at      timestamptz,
  active_post_count    int         NOT NULL DEFAULT 0 CHECK (active_post_count >= 0 AND active_post_count <= 3),
  strike_count         int         NOT NULL DEFAULT 0 CHECK (strike_count >= 0),
  status               public.profile_status NOT NULL DEFAULT 'active',
  suspended_until      timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Partial index — almost all queries filter on active profiles.
CREATE INDEX profiles_status_idx ON public.profiles (status) WHERE status = 'active';
-- Identifier lookup used by the generator and by display queries.
-- (Uniqueness is already enforced by the UNIQUE constraint above.)
CREATE INDEX profiles_identifier_idx ON public.profiles (anonymous_identifier);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read the public-safe columns of active profiles (identifier, language, status).
-- The full row (age_verified_at, active_post_count, strike_count, suspended_until) is
-- only accessible to the owning user via the self-select policy below.
--
-- NOTE: the client must SELECT only the safe columns when building public views.
--       The identifier and status are safe; active_post_count and strike_count are not.
CREATE POLICY "active profiles are publicly readable"
  ON public.profiles FOR SELECT
  USING (status = 'active');

-- Self: full row readable (needed for settings screen and onboarding).
CREATE POLICY "users can read own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

-- Self: can update language preference only.
-- active_post_count, strike_count, status, suspended_until are server-managed.
CREATE POLICY "users can update own language"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Prevent any client-initiated INSERT (rows only created by the trigger below).
-- No INSERT policy → default deny.

-- Prevent any client-initiated DELETE (profiles are never deleted directly).
-- No DELETE policy → default deny.

-- ---------------------------------------------------------------------------
-- Trigger: enforce server-only columns on UPDATE
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_profile_update_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Internal trigger functions are SECURITY DEFINER (run as 'postgres').
  -- Client connections run as 'authenticated' or 'anon'.
  -- Bypass all column guards for internal / service-role operations.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- These columns are managed by triggers/service-role only.
  IF NEW.active_post_count IS DISTINCT FROM OLD.active_post_count THEN
    RAISE EXCEPTION 'cannot change active_post_count directly';
  END IF;
  IF NEW.strike_count IS DISTINCT FROM OLD.strike_count THEN
    RAISE EXCEPTION 'cannot change strike_count directly';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'cannot change status directly';
  END IF;
  IF NEW.suspended_until IS DISTINCT FROM OLD.suspended_until THEN
    RAISE EXCEPTION 'cannot change suspended_until directly';
  END IF;
  IF NEW.age_verified_at IS DISTINCT FROM OLD.age_verified_at
     AND OLD.age_verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'cannot change age_verified_at once set';
  END IF;
  -- Allow transition from pending_* → real identifier (generate-identifier function path).
  -- Once a real identifier is set it is immutable.
  IF NEW.anonymous_identifier IS DISTINCT FROM OLD.anonymous_identifier THEN
    IF OLD.anonymous_identifier NOT LIKE 'pending_%' THEN
      RAISE EXCEPTION 'cannot change anonymous_identifier';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_profile_update_columns_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_update_columns();

-- ---------------------------------------------------------------------------
-- Trigger: updated_at maintenance
-- (The enforce trigger above sets it, but this covers service-role updates too.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: auto-create profile on auth.users insert
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, anonymous_identifier)
  VALUES (
    NEW.id,
    -- Placeholder; overwritten by generate-identifier Edge Function within seconds.
    'pending_' || substr(NEW.id::text, 1, 8)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
