-- Migration 0013: Add onboarded_at to profiles
-- Phase 4: tracks whether a user has completed the onboarding screens.
-- NULL means not yet onboarded (show onboarding pager).
-- NOT NULL means onboarded (go straight to feed).

-- CRITICAL-PATH: auth — pending expert review

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- RLS: users can update their own onboarded_at (set it once, never clear it).
-- The column is included in the allowed-columns guard trigger via a SECURITY DEFINER bypass.
-- Client sets it via a direct UPDATE (not a trigger) because it's intentional user action.

COMMENT ON COLUMN public.profiles.onboarded_at IS
  'Timestamp when the user completed onboarding screens. NULL = not yet onboarded.';
