-- Migration 0014: Add 'deleted' value to profile_status enum
-- Split from the column/index/cron setup (0015) because ALTER TYPE ... ADD VALUE
-- cannot be used in the same transaction that references the new value.

-- CRITICAL-PATH: auth privacy — pending expert review

ALTER TYPE public.profile_status ADD VALUE IF NOT EXISTS 'deleted';
