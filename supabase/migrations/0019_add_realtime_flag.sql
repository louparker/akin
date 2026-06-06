-- Phase 6.3: realtime_open kill-switch
-- Default true — realtime stays on unless the founder flips it off for cost
-- control or incident response. Mirrors the signups_open / posting_open pattern.
INSERT INTO feature_flags (key, value, description)
VALUES (
  'realtime_open',
  true,
  'Enable Supabase Realtime subscriptions on post detail screens. Set false to disable all realtime.'
)
ON CONFLICT (key) DO NOTHING;
