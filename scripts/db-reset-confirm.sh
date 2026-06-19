#!/usr/bin/env bash
# Guarded wrapper around `supabase db reset`.
#
# Why: `supabase db reset` drops the local Postgres database and replays only
# what's in `supabase/migrations/` and `supabase/seed.sql`. EVERY OTHER ROW is
# lost — users you signed up via the app, posts/comments you created during
# testing, reports you filed, audit log entries, manual SQL fixes. There is no
# undo.
#
# This wrapper adds a typed confirmation so an autopilot `pnpm db:reset` does
# not silently wipe work in progress. CI and scripted callers should invoke
# `pnpm db:reset:force` (or `supabase db reset` directly) to skip the prompt.

set -euo pipefail

RED='\033[31m'
YELLOW='\033[33m'
RESET='\033[0m'

printf "${RED}\xe2\x9a\xa0  pnpm db:reset destroys ALL local DB rows not in seed.sql.${RESET}\n"
printf "   Gone: users you signed up via the app, posts you authored, reports,\n"
printf "         audit log rows, manual SQL fixes, suspended_until backdating, etc.\n"
printf "   Kept: only what's in supabase/migrations/ and supabase/seed.sql.\n"
printf "\n"
printf "   For CI or scripted use without this prompt: ${YELLOW}pnpm db:reset:force${RESET}\n"
printf "\n"
printf "Type ${YELLOW}reset${RESET} to confirm, anything else to cancel: "

read -r confirmation
if [ "${confirmation:-}" = "reset" ]; then
  exec supabase db reset
fi

printf "${YELLOW}Cancelled.${RESET} No changes made.\n"
exit 1
