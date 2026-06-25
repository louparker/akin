# Akin — Architecture Decision Record

> Append-only log of non-trivial decisions. Newest at the top. Never edit a previous entry — supersede it with a new one.

## Format

```
## ADR-NNN — Short title
Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by ADR-XXX
Decided by: Founder | Founder + advisor name

### Context
What problem are we solving? What constraints are in play?

### Options considered
1. Option A — pros / cons
2. Option B — pros / cons
3. Option C — pros / cons

### Decision
What we chose and why.

### Consequences
What this makes easier. What this makes harder. What we'll need to revisit.
```

When you make a non-obvious choice — picking a library, structuring a query, designing an RLS pattern — write an ADR. Future-you and the next agent session will thank you.

---

## ADR-029 — Align Expo SDK 55 native runtime packages before rebuilding

Date: 2026-06-25
Status: Accepted
Decided by: Founder

### Context

The app hit `Exception in HostFunction` while Expo Router imported routes that
touch `react-native-reanimated` (`PostCard`, post detail). Router then reported
false "missing default export" and nested route warnings because those modules
threw during route discovery. ADR-026 already identified the stale-native-build
pattern, but `expo-doctor` also showed that the project had drifted from Expo
SDK 55's expected native package versions: Reanimated/Worklets were ahead of the
SDK, and Metro packages were pinned behind Expo's current patch line.

### Options considered

1. **Align to Expo Doctor's SDK 55 versions and rebuild native iOS** — fixes the
   native ABI/runtime mismatch at the source and keeps Reanimated available.
2. **Only rebuild the old dependency set** — may clear a stale binary locally,
   but keeps the latent Expo SDK drift.
3. **Remove Reanimated from route-imported components** — avoids the crashing
   import path, but drops animations and masks the native runtime mismatch.

### Decision

Option 1. Use Expo's compatibility matrix (`expo install --fix`) to align SDK 55
packages, pin `react-native-reanimated` to `4.2.1` and
`react-native-worklets` to `0.7.4`, add the required `expo-font` and
`expo-localization` config plugins, update the dev tooling packages, remove the
Metro `0.83.6` overrides that blocked Expo's expected `0.83.7` Metro packages,
and run a fresh iOS native rebuild.

### Consequences

- `expo-doctor` now passes all checks.
- The rebuilt native app has Reanimated/Worklets compiled against the SDK-aligned
  versions, which is the intended fix for the HostFunction route-import crash.
- Sentry is aligned back to Expo SDK 55's expected `~7.11.0`; revisit before a
  production build if a newer Sentry feature is needed.
- The code fallback (removing Reanimated animations from route-imported files)
  remains available only if testing the rebuilt app still reproduces the crash.

---

## ADR-028 — Spice averages trigger bypasses post RLS

Date: 2026-06-25
Status: Accepted
Decided by: Founder

### Context

Spice votes were accepted by `spice_votes` RLS, but the post aggregate fields
(`total_spice_score`, `spice_vote_count`, `average_spice_level`) did not update
for real authenticated voters. The `maintain_spice_averages` trigger wrote to
`public.posts` as the voter, and voters are not allowed to update posts they do
not own. That left feed cards without spice flames and made "highest spice"
filters operate on stale zero/null aggregates.

### Options considered

1. **Make the aggregate trigger `SECURITY DEFINER`** — keeps writes server-side,
   matches the other denormalised counters, and bypasses only the post aggregate
   write blocked by RLS.
2. **Relax posts UPDATE RLS for aggregate columns** — exposes a broad client
   write path and is harder to reason about safely.
3. **Recalculate spice averages in client queries** — avoids trigger privileges,
   but makes feed sorting/filtering slower and duplicates aggregate logic.

### Decision

Option 1. Migration `0029_spice_averages_security_definer.sql` recreates
`public.maintain_spice_averages()` with `SECURITY DEFINER` and
`SET search_path = public`. The trigger still only responds to
`spice_votes` inserts, updates, and deletes; clients gain no direct authority to
modify post aggregate columns.

### Consequences

- Authenticated votes now update post aggregates immediately at the database
  layer, so feed spice display and spice sorting/filtering use current data.
- `spice_votes.test.sql` now includes an authenticated-voter regression case
  proving that the trigger can update `posts` through RLS.
- Security review for future aggregate triggers should check whether the actor
  has permission to write the denormalised target row, not only the source row.

---

## ADR-027 — Deleting your last comment frees your slot ("leave the conversation")

Date: 2026-06-24
Status: Accepted
Decided by: Founder

### Context

Deleting a _post_ as OP frees every participant's active slot (ADR / migration
0026). But deleting a _comment_ as a non-OP did nothing to the counts: the
commenter stayed seated as one of the post's 4 participants and kept their
elevated `active_post_count`, so they remained "active in a conversation" they
had effectively left — stuck below their 3-post allowance. The founder reported
exactly this asymmetry (post-delete reduced the active count, comment-delete did
not).

### Options considered

1. **Leave the conversation** — deleting your last active comment on a not-full
   post removes you as a participant (vacate the seat, `participant_count--`) and
   frees your active slot. Full parity with OP post-delete; the seat reopens for
   someone new; you may re-join later by commenting again. Most consistent.
2. **Free your slot only** — decrement `active_post_count` but keep the seat. Simpler,
   but the seat is held by someone no longer active, and re-commenting wouldn't
   re-count them. Internally inconsistent.
3. **Do nothing** — status quo; rejected (the reported bug).

### Decision

Option 1. Migration `0028_free_slot_on_comment_delete.sql` adds an
`AFTER UPDATE OF status` trigger on `comments`: on `active → deleted`, if the
author is **not** the OP, the post is **not full** (`participant_count < 4`), and
this was their **last** active comment, they leave — removed from
`post_participants`, `participant_count` decremented, `active_post_count`
decremented (`GREATEST(x-1, 0)`). They are **not** added to
`post_participant_removals`, so a fresh comment re-admits them.

Deliberately scoped to **not-full** posts, exactly like 0026: a full post already
returned everyone's slot when it filled (`decrement_active_on_full`, 0005);
un-filling it would reopen a seat and double-count on the next join. Full posts
are left untouched. `SECURITY DEFINER` so the `participant_count` write bypasses
the authenticated column guard the same way 0005/0017 do.

Client: `useDeleteComment` now calls `refreshProfile()` on success so the
active-conversations pill reflects the freed slot.

### Consequences

- **Supersedes the old invariant** that "soft-deleting a comment does not change
  participation counts." `participation_limits.test.sql` test 11 was rewritten to
  assert the new leave behaviour, and `0028_free_slot_on_comment_delete.test.sql`
  covers last-comment leave, not-last no-op, re-join, and the full-post no-op.
- A "3/4" post a participant leaves becomes re-joinable — intended (they're no
  longer in the conversation). Their soft-deleted comments stay hidden from others
  via the existing `status = 'active'` SELECT policy.
- Full-post comment deletes intentionally do **not** free a slot. If we later want
  symmetric behaviour there, it needs the same careful re-charge handling as
  `apply_op_participant_removal` Case B (0017) and its own pgTAP.

---

## ADR-026 — Correction: the HostFunction app-load crash was a stale native build

Date: 2026-06-23
Status: Accepted (supersedes the crash-cause claim in ADR-024)
Decided by: Founder

### Context

ADR-024 and the commit that introduced it claimed the `Exception in HostFunction`
app-load crash (at the `react-native-reanimated` import in `PostCard`) was caused
by a duplicate Babel worklets plugin. **That was wrong.** Removing the duplicate
plugin and clearing the Metro cache did **not** fix it. Two further hypotheses —
the reanimated/worklets version skew vs Expo's expected versions — also did not
turn out to be the blocker.

### What actually fixed it

A full native rebuild via `pnpm ios` (`expo run:ios`). The device had been running
a **stale native binary** (`ios/build` dated months earlier); `expo start -c` only
refreshes the JS bundle, so it kept serving fresh JS to a native app whose
Reanimated/Worklets host functions didn't match. Recompiling the native modules
realigned them and the crash disappeared. The crash surfaced now (not earlier)
because the dark-mode merge added the first real Reanimated usage (`FadeInDown`
entrance animations), which forces the runtime to initialize on import.

### Consequences

- **Operational rule:** an `Exception in HostFunction` after a JS-only refresh means
  do a full native rebuild (`pnpm ios`), not a cache clear. `expo start -c` is not enough.
- The Babel change in ADR-024 is retained as a **valid cleanup** (babel-preset-expo 55
  already auto-adds `react-native-worklets/plugin`), but it is explicitly _not_ a crash fix.
- **Still open / latent:** the project pins reanimated `4.3.1` / worklets `0.8.3`, ahead
  of Expo SDK 55's expected `4.2.1` / `0.7.4`. It runs after a clean rebuild, but
  `expo-doctor` will warn and it could bite on the EAS production (closed-beta) build.
  Align before cutting that build.

---

## ADR-025 — Soft-delete RLS visibility: authors must read their own deleted rows

Date: 2026-06-23
Status: Accepted
Decided by: Founder

### Context

Running the pgTAP suite (as an authenticated client, not the bypassing `postgres`
role) revealed that soft-delete was **fundamentally broken** for real users:
`UPDATE <table> SET status='deleted'` raised `new row violates row-level security
policy`. PostgreSQL requires a row modified by UPDATE to remain visible under the
table's SELECT policies; the `anyone reads active <x>` policies only expose
`status='active'`, so the new `deleted` row matched no SELECT policy and was
rejected. This was latent because every prior pgTAP soft-delete ran as `postgres`
(RLS bypassed). 0025 relaxed the UPDATE policy but did not address row visibility.

### Decision

Migration `0027` adds a permissive SELECT policy `authors read own deleted
{posts,comments}` scoped to `USING (author_id = auth.uid() AND status =
'deleted')`. Scoped to `deleted` deliberately — that is exactly the new row a
soft-delete produces. Active-content visibility stays governed entirely by the
block/removal-aware `anyone reads active` policies, so a **removed** user still
cannot see their own active comments on a post they were removed from (a broad
`author_id = auth.uid()` policy broke that invariant — caught by
`op_participant_removal.test.sql`).

### Consequences

- Soft-delete (and the `.select('id')` RETURNING in the delete hooks) now works
  for authenticated users. pgTAP green (155 tests).
- General rule for this codebase: **any status transition that hides a row from
  the public SELECT policy needs a matching narrow SELECT policy for the actor**,
  or the UPDATE fails RLS. Moderation hides via SECURITY DEFINER, so it is unaffected.
- Edits (status stays `active`) are still covered by `anyone reads active`; no
  extra policy needed for them.

---

## ADR-024 — Soft-deleting a post frees participants' active slots + Babel worklets fix

Date: 2026-06-23
Status: Accepted
Decided by: Founder

### Context

Two issues after ADR-023:

1. **Deleting a post didn't return the OP's active slot.** `active_post_count` is incremented when you join a post and only decremented by `decrement_active_on_full` when the post reaches 4 participants (0005). Nothing handled deletion, so a soft-deleted post kept counting against the OP's 3-post limit.
2. **App crashed on load** with `Exception in HostFunction` at the `react-native-reanimated` import (cascading to "missing default export" + routing warnings for every route that imports `PostCard`).

### Decisions

- **`free_slots_on_post_delete` trigger (0026).** AFTER UPDATE OF status on posts: on `active→deleted`, if the post was **not full** (`participant_count < 4`), decrement `active_post_count` for every row in `post_participants` (`GREATEST(x-1, 0)`). Full posts are skipped because `decrement_active_on_full` already returned everyone's slot when the post filled — decrementing again would double-count. SECURITY DEFINER, mirroring the other limit triggers. This frees **all** still-active participants, not just the OP, which is the invariant-correct behaviour (the conversation is gone for everyone). pgTAP added.
- **Babel worklets double-plugin removed.** `babel-preset-expo@55` auto-adds `react-native-worklets/plugin` when `react-native-worklets` is installed. `babel.config.js` _also_ listed `react-native-reanimated/plugin` (a re-export of the same worklets plugin), so worklets were transformed twice → the HostFunction crash. Removed the manual entry; the preset is the single source.

### Consequences

- Migration `0026` must be applied. Comment soft-delete still does **not** free a slot (unchanged, and covered by `participation_limits.test.sql` test 11) — only post deletion does, by design.
- Moderation hiding a post (`active→hidden`) does not free slots; out of scope here. Revisit if moderation load makes it matter.
- The Babel change requires a Metro cache reset (`npx expo start -c`) and, if running a stale dev client, a native rebuild.
- pgTAP for both `0025` and `0026` still needs a local-stack / CI run (`pnpm db:test`).

---

## ADR-023 — Phase 8: edit/delete windows, spice upsert, post-create flow, confirm-email link

Date: 2026-06-23
Status: Accepted
Decided by: Founder

### Context

A batch of Phase 8 UX/correctness fixes surfaced in real use:

1. Authors could not delete their own post/comment after the 15-minute edit window (the UPDATE RLS policy gated _all_ updates, including the status→deleted soft-delete).
2. There were no edit/delete affordances for **posts** (comments already had them).
3. Spice votes failed silently on the second tap (plain INSERT against the `(post_id, user_id)` PK) and never refreshed the feed cards.
4. After posting, the user landed on the post detail and had to pull-to-refresh to see the new post in the feed.
5. The signup confirmation email's CTA was a raw `akin://confirm` custom-scheme link, which email clients refuse to render as tappable — a dead button.
6. The comment-create flow never called `refreshProfile()`, so the active-conversations count went stale (posting already did).

### Decisions

- **Delete anytime, edit within 15 min (0025).** The UPDATE RLS policy on `posts`/`comments` is relaxed to ownership-only, and the 15-minute window moves into the `enforce_*_update_columns` triggers, which already see which columns change. A body/title change after the window raises `P0021`; `status active→deleted` is allowed at any time. Soft-delete means the row is retained for moderation, so "delete anytime" does not weaken accountability. `useEditComment`/`useEditPost` map `P0021` → `window_closed`.
- **Post edit/delete UI** mirrors the comment pattern: inline editor + OP-only menu items on the post detail. The More menu is now role-split (OP: edit/delete/remove; others: report/block), which also removes the odd "report your own post" entry.
- **Spice upsert.** `useVoteSpice` upserts on the `(post_id, user_id)` PK (the trigger already maintains the denormalised average across INSERT/UPDATE/DELETE, and RLS already allows "update own vote"), and invalidates both `['post']` and `['feed']`. Feed cards round `average_spice_level` for the flame count.
- **Post-create routes to the feed.** `useCreatePost` already invalidated `['feed']`; the create screen now `router.replace('/(main)/feed')` instead of the post detail, so the existing highlight entrance animation plays without a manual pull.
- **Confirm-email via https passthrough.** The signup CTA now points at `https://ourakin.com/auth/confirm` (clickable in email), a static page that immediately forwards to `akin://confirm?token_hash=…&type=signup`. This keeps the in-app `verifyOtp({ token_hash })` flow **unchanged** — the lowest-risk fix — rather than switching to the Supabase verify-redirect flow (which would consume the token server-side and require reworking `confirm.tsx`).

### Consequences

- **Founder action required:** deploy `docs/auth-confirm-redirect.html` at `https://ourakin.com/auth/confirm` before opening signups. CRITICAL-PATH auth — verify on real iOS + Android devices.
- pgTAP `edit_window.test.sql` updated: old-post body edits now throw `P0021` (was: RLS-hidden), and old post/comment soft-deletes now succeed. Needs a local stack / CI run (`pnpm db:test`) — not executed in this session.
- Migration `0025` must be applied (`supabase db push` / `migration up`) for delete-anytime to take effect.
- The `report-your-own-post` menu entry is gone; if product ever wants self-report, re-add it under the `isOP` branch.

---

## ADR-022 — Phase 8.3: Email confirmation via OTP code + token_hash deep link

Date: 2026-06-23
Status: Accepted
Decided by: Founder

### Context

After ADR-021 the signup confirmation email rendered and sent correctly, but
two problems surfaced in real testing:

1. **The "Confirm email" link returned `{"message":"No API key found..."}`.**
   The Supabase web verify endpoint (`/auth/v1/verify`) works without an apikey,
   but it then 303-redirects to `redirect_to`. Signup never set `emailRedirectTo`,
   so `redirect_to` fell back to the project Site URL, which resolved to the
   Supabase API domain — and landing on that gateway without an apikey produces
   the error. (Verified empirically: the verify endpoint itself returned a clean
   303; the error came from the post-verify redirect target.)
2. **No way to confirm cross-device.** The verify screen only _polled_ for the
   link to be clicked. A magic link can only re-open the app when the email is
   opened on the same phone with the app installed — fragile for a mobile app.

### Options considered

1. **Fix the link redirect only** — set `emailRedirectTo` to an app deep link and
   handle the returned tokens/code in a confirm route. Still leaves cross-device
   confirmation impossible and requires fragment/PKCE handling on native.
2. **OTP code entry as the primary path + a direct token_hash deep link
   (chosen)** — the email shows a code the user types into the app, and the
   "Confirm" button is a direct `akin://confirm?token_hash=…&type=signup` deep
   link the app verifies with `verifyOtp({ token_hash })`. No Supabase web
   redirect, so the apikey error disappears, and the code works on any device.

### Decision

- **Code entry (primary).** `verifyEmailOtp(email, token)` on the auth store calls
  `verifyOtp({ email, token, type: 'signup' })`, fetches the profile, and routes
  via the existing `routeAfterSignIn`. `verify.tsx` gains a numeric code input
  (`oneTimeCode` autofill) and an "Open email app" button (`message://` on iOS,
  `mailto:` fallback). The existing confirmation poll stays as a fallback.
- **Deep link (secondary).** `buildConfirmationUrl` now emits
  `akin://confirm?token_hash=…&type=signup` for signup only. A new
  `app/(auth)/confirm.tsx` reads the params and calls `confirmFromDeepLink`,
  which runs `verifyOtp({ token_hash, type })` and routes (recovery →
  reset-confirm; everything else → `routeAfterSignIn`). A `ran` ref guards the
  single-use token against a double-invoke on re-render.
- **Recovery / email_change unchanged.** They keep the Supabase verify URL (their
  `redirect_to` is already an app deep link), so this change doesn't touch that
  flow. The `confirmFromDeepLink` recovery branch exists so the generic confirm
  route is correct if those are migrated later.

### Consequences

- Signup confirmation now works on any device: type the code, or tap the link on
  the same phone. The apikey error is gone because there is no web redirect.
- No dashboard redirect allow-list entry is needed for signup (the deep link
  never round-trips through Supabase). Recovery still relies on its existing
  `akin://reset-confirm` allow-list entry.
- Custom-scheme links (`akin://…`) won't open from a desktop browser — that's by
  design; the code covers the cross-device case.
- New store surface (`verifyEmailOtp`, `confirmFromDeepLink`) and a new route are
  CRITICAL-PATH: auth and need expert review before production.

### Related work

Store: `src/features/auth/store/useAuthStore.ts` (+ tests).
Screens: `app/(auth)/verify.tsx`, `app/(auth)/confirm.tsx`, `_layout.tsx`.
Hook template: `supabase/functions/send-auth-email/templates.ts` (+ tests).
Builds on ADR-021. Skills: `security`, `i18n`, `testing`.

---

## ADR-021 — Phase 8.2: Auth emails via a Send Email Hook (bilingual, Resend)

Date: 2026-06-22
Status: Accepted
Decided by: Founder

### Context

The signup-confirmation, password-reset, and email-change flows already had
working client screens (`verify.tsx`, `reset-password.tsx`, `reset-confirm.tsx`)
and triggered the correct Supabase Auth events. But the emails themselves were
sent by Supabase Auth's built-in sender, which is unusable in production:

- Rate-limited to a few emails/hour (a testing-only shared SMTP).
- Sends from a `supabase.co` address, not `ourakin.com`.
- A single default template — single language — which violates the
  bilingual-from-day-one non-negotiable (CLAUDE.md §2.5).

Resend was wired and domain-verified during Phase 8.1, so the delivery channel
existed; the gap was routing auth emails through it with bilingual templates.

### Options considered

1. **Custom SMTP only** — point Supabase Auth at Resend's SMTP endpoint and
   customise the single built-in template per type. Fast; fixes the rate limit
   and sender domain. But the built-in templates are single-language, so this
   could not satisfy the bilingual rule without the hook anyway. Stopgap.
2. **Send Email Hook (chosen)** — Supabase Auth POSTs each transactional email
   to an Edge Function, which renders a bilingual branded template (language
   from `user.user_metadata.language`, set at signup) and sends via the Resend
   API. No SMTP config; the hook fully owns sending. Reuses the exact Resend
   pattern from `notify-moderation`/`report-csam` (ADR-020).
3. **pg_net from an auth trigger** — not supported for auth emails; rejected.

### Decision

Option 2. The `send-auth-email` Edge Function:

- Verifies the request with Standard Webhooks (`SEND_EMAIL_HOOK_SECRET`) before
  trusting any field — the function is internet-exposed, so signature
  verification is the auth boundary.
- Reads language from user metadata (default `sv`), builds the Supabase
  `/auth/v1/verify` URL from `email_data`, renders the template, sends via Resend.
- Pure template + URL logic lives in `templates.ts` (no Deno/remote imports) so
  it is unit-tested with Jest (14 tests); the `index.ts` entry stays thin and is
  validated by the Supabase CLI on deploy. Swedish copy is marked
  `// TODO i18n review:` for native sign-off.

Client screens and the `signUp` / `resetPasswordForEmail` calls are unchanged.

### Manual configuration (founder, before this works in production)

These cannot be done from code — they live in the Supabase Dashboard / CLI:

1. **Deploy the function:** `supabase functions deploy send-auth-email`.
2. **Enable the hook:** Dashboard → Authentication → Hooks → "Send Email" →
   point to the deployed `send-auth-email` function. Copy the generated secret.
3. **Set the secret:** `supabase secrets set SEND_EMAIL_HOOK_SECRET=v1,whsec_...`
   (the function strips the `v1,whsec_` prefix before verifying).
4. **Redirect allow-list:** Dashboard → Authentication → URL Configuration →
   add `akin://reset-confirm` (and the signup redirect, if any) to the allowed
   redirect URLs, so the email links resolve back into the app.
5. `RESEND_API_KEY` is already set (shared with ADR-020 functions).

### Consequences

- Auth emails now come from `ourakin.com` via Resend, with no built-in rate
  limit, in the user's language. Satisfies the bilingual non-negotiable.
- Once the hook is enabled, Supabase Auth no longer sends via its built-in SMTP
  for these emails — if the hook errors, the user gets no email, so the function
  returns the Supabase error envelope and failures must be monitored (Sentry on
  the Edge Function logs is a Phase 8 ops item).
- A new secret (`SEND_EMAIL_HOOK_SECRET`) is required. The hook is a
  CRITICAL-PATH: auth surface and needs expert review before production.
- The OTP `token` is included in the email as a fallback code; the primary CTA
  is the verify link the existing poll-based `verify.tsx` flow depends on.

### Related work

Function: `supabase/functions/send-auth-email/{index.ts,templates.ts}`.
Tests: `supabase/functions/send-auth-email/__tests__/templates.test.ts`.
Builds on ADR-020 (Resend pattern). Skills: `security`, `i18n`, `testing`.

---

## ADR-020 — Phase 8.1: T&S hardening — email notifications, Warn label, CSAM evidence export

Date: 2026-06-21
Status: Accepted
Decided by: Founder

### Context

Phase 7 left four explicit deferrals documented in ADR-019:

1. Resend email templates for suspend/ban notifications (Resend client existed, no templates).
2. Mod action button labelling (Warn silently triggered auto-ban at strike 2 — opaque to moderators).
3. `report-csam` Edge Function (spec deferred; founder was forwarding manually from audit log).
4. ECPAT Sweden / NCMEC engagement (hard gate before public launch).

Phase 8.1 closes all four.

### Options considered

**Email delivery channel:**

1. **pg_net from within `moderate_report()`** — transactional guarantee, but adds pg_net setup complexity and makes the PL/pgSQL function harder to test.
2. **Client-side invocation from `useModerateReport` `onSuccess`** — fire-and-forget, simpler, testable with Jest mock. Email failure never rolls back the moderation action (intentional — email is best-effort).
3. **Database trigger + pg_net** — strongest guarantee, hardest to maintain.

Chose option 2. Rationale: moderation email is a notification, not a commitment. If the Edge Function fails, the audit log is the authoritative record. Adding pg_net just to send a "you've been warned" email is over-engineering.

**Warn label escalation display:**
The Warn button previously showed "Warn user (CrimsonFox42)". At strike 2, pressing it auto-bans; at strike 1, it auto-suspends. A moderator who doesn't know the user's strike count cannot predict the consequence. Options: tooltip, separate confirmation step, or inline label suffix.

Chose inline label suffix: "→ Strike 2 of 3 (will auto-suspend 7 days)". Reasons: (a) inline is impossible to miss, (b) no extra tap or hover required, (c) the confirmation modal is still there as a second gate. The `buildActions` function is extracted to a testable utility to enable coverage of the three strike-count branches.

**CSAM evidence export:**
Options were: (a) export on-demand from audit log (cheapest, but requires manual SQL), (b) write to Supabase Storage bucket (structured, auditable, survives schema changes), (c) push to S3 (unnecessary vendor add). Chose (b). The export JSON is structured to match NCMEC CyberTipline format so that when the API integration is added pre-launch, the payload is already correct.

### Decision

1. **`notify-moderation` Edge Function** — called from `useModerateReport` `onSuccess` for warn/suspend/ban actions. Reads report → resolves target user → fetches email via admin API → sends bilingual HTML email via Resend. Runs as moderator's session (JWT forwarded); verifies moderator role internally. Swedish copy marked `// TODO i18n review:` pending native sign-off.

2. **Warn label polish** — `buildActions` extracted to `src/features/moderation/utils/buildActions.ts`. Accepts `strikeCount: number`. Label reads "Warn user (u) — → Strike N of 3 (…)". `useModeratorReport` extended to fetch `targetStrikeCount` from `profiles` for the resolved target user.

3. **`report-csam` Edge Function** — invoked from `useModerateReport` `onSuccess` for the csam action only. Writes a structured JSON export to the private `csam-reports` Storage bucket (NCMEC CyberTipline format). Emails founder with case reference and manual submission checklist. Direct ECPAT/NCMEC API integration is deferred to Phase 8.9 (see docs/csam-compliance.md).

4. **`docs/csam-compliance.md`** — structured pre-launch compliance checklist covering: Storage bucket setup, ECPAT Sweden engagement steps, NCMEC CyberTipline registration, internal SLA, completion record template, and post-incident record template.

### Consequences

- Moderators now see the real consequence of every Warn action before confirming. The auto-escalation introduced in ADR-019 migration 0023 is no longer opaque.
- Affected users receive a bilingual email within minutes of a warn/suspend/ban action. Swedish copy needs a native UX writer review before launch (`grep -r "TODO i18n review:"` surfaces it).
- CSAM cases produce an evidence export file automatically. The founder still submits manually to ECPAT/NCMEC for v1, but the export is in the right format for the API integration that will replace manual submission pre-launch.
- Two new secrets are required: `FOUNDER_EMAIL` (report-csam) and `RESEND_API_KEY` (both functions, may already be set). Add to `supabase secrets set` before deploying.
- The `csam-reports` Storage bucket must be created manually in the Supabase Dashboard before the first production deployment. It must be **private, no lifecycle auto-delete**. See docs/csam-compliance.md §2.2.
- The ECPAT/NCMEC engagement checklist (docs/csam-compliance.md) is a hard gate before public launch — not before App Review.

### Related work

Functions: `supabase/functions/notify-moderation/index.ts`, `supabase/functions/report-csam/index.ts`.
Util: `src/features/moderation/utils/buildActions.ts`.
Tests: `src/features/moderation/__tests__/buildActions.test.ts`, `src/features/moderation/__tests__/useModerateReport.test.ts`.
Checklist: `docs/csam-compliance.md`.
Skills: `.claude/skills/moderation/SKILL.md`, `security`, `i18n`, `testing`.

---

## ADR-024 — Phase 8.4 accessibility audit: a11yCheck helper, tap-target fixes, ARIA roles

> Renumbered from ADR-021 during the Phase 8 branch merge — ADR-021 here is the auth-email decision. This work landed in parallel on `claude/phase-8-settings-completion`.

Date: 2026-06-21
Status: Accepted
Decided by: Founder

### Context

Phase 8.4 performed a full WCAG 2.2 AA accessibility audit across all screens and components built in Phases 1–8.3. The `a11yCheck` helper referenced in CLAUDE.md and the UI skill did not exist; several interactive elements had missing or incorrect roles/labels; and two tap targets were below the 44pt minimum.

### Issues found and fixed

1. **`a11yCheck` helper missing** — Created `src/lib/test-utils/a11y.ts` plus `src/lib/test-utils/index.ts` barrel. The helper traverses the React test instance tree and fails on any interactive element (button, link, radio, tab, etc.) that has no accessible label. 324/324 tests pass with it wired in.

2. **TopBar — duplicate `accessibilityRole="header"`** — The container `<View>` had the role and so did the title `<Text>`, causing double announcements. Removed from the View; kept on the Text (the semantic heading).

3. **FeedHeader wordmark** — Added `accessibilityRole="header"` to the "akin" wordmark text so VoiceOver users can navigate to the screen heading.

4. **FilterSheet overlay dismiss** — Had `accessibilityLabel` but no `accessibilityRole="button"`, making it invisible to assistive technology.

5. **PostDetail more-menu overlay** — Same missing role. Also the `accessibilityLabel="More options"` was a hardcoded English string; replaced with `t('common.moreOptions')` and added the key to both locales.

6. **CommentItem action-sheet overlay** — Same missing role.

7. **CommentItem `⋯` menu button** — Icon glyph rendered at ~16pt with no hitSlop. Added `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` to reach the 44pt minimum. Also added explicit `accessibilityLabel` and `accessibilityState` to the inline-edit cancel/save buttons.

8. **PostDetail send button** — 40×40pt; added `hitSlop={4}` to reach 48×48pt.

9. **Settings section titles** — Inline `<Text>` section headings (Language, Appearance) and the `Section` component's header text now carry `accessibilityRole="header"` so screen readers can navigate by headings.

### New i18n keys

- `common.moreOptions` → EN: "More options" / SV: "Fler alternativ"

### New test coverage

- `src/lib/test-utils/a11y.ts` — `a11yCheck` helper
- `src/components/composed/__tests__/PostCard.test.tsx` — PostCard a11y
- `src/features/feed/components/__tests__/FilterSheet.test.tsx` — FilterSheet a11y
- `src/features/post/components/__tests__/SpiceVoteSheet.test.tsx` — SpiceVoteSheet a11y
- SettingsScreen and CommentItem tests extended with a11y assertions

### Consequences

- All interactive elements in the audited surface now have accessible labels and roles.
- All tap targets meet the 44pt minimum (via hitSlop where the visual size is smaller).
- The `a11yCheck` helper is now available from `@/lib/test-utils` for all future screen tests.
- Screen tests written during later phases should include `expect(a11yCheck(root)).toEqual([])`.

---

## ADR-023 — Phase 8 settings: locale store, blocked_identifier, appConfig

> Renumbered from ADR-020 during the Phase 8 branch merge — ADR-020 here is the T&S-hardening decision. This work landed in parallel on `claude/phase-8-settings-completion`.

Date: 2026-06-20
Status: Accepted
Decided by: Founder

### Context

Phase 8 settings completion (sub-tasks 8.2c–8.2f) required three non-obvious
architecture decisions: how to implement runtime locale switching without a new
dependency, how to show blocked users' identifiers without leaking auth data, and
how to pass build-time URLs into the app in a testable way.

### Options considered

**Locale switching (8.2c)**

1. **i18next** — full i18n library, proper React integration, plural/format support. Pros: industry standard, polished. Cons: new top-level dependency (violates CLAUDE.md §6 without discussion), significant integration surface area across the codebase.
2. **Custom Zustand locale store (chosen)** — `useLocaleStore` with persist middleware; `getActiveLocale()` reads the store on every `t()` call; `useT()` hook subscribes via Zustand for component re-renders. Pros: zero new deps, consistent with the existing Zustand pattern, fast. Cons: no plural formatting; `t()` is not reactive without `useT()`, so callers that call `t()` without `useT()` don't re-render on locale change (acceptable for one-shot strings and static UI).
3. **Device locale only** — no user preference, read `getLocales()` once at module load. Pros: simplest. Cons: non-starter for the product requirement (user must be able to switch).

**Blocked-identifier display (8.2e)**

1. **Join through profiles at query time** — `SELECT p.anonymous_identifier FROM blocks b JOIN profiles p ON p.user_id = b.blocked_id`. Pros: always up to date. Cons: the profiles RLS policy that prevents leaking `auth.users` data is subtler here; a misconfigured join could expose the blocked user's profile row columns in excess of what's needed.
2. **Denormalised `blocked_identifier` on the blocks row (chosen)** — migration 0024 adds the column, a BEFORE INSERT trigger auto-populates from profiles, backfill runs in the migration. The `useMyBlocks` hook selects only `blocked_id, blocked_identifier, created_at`. Pros: query is simple and safe; the identifier is stable once set (anonymous identifiers don't change); no join risk. Cons: identifier on the block row could theoretically diverge from profiles if identifiers were ever recycled — they are not (identifiers are assigned once at signup and never changed).

**Build-time config testability (8.2f)**

1. **Read `Constants.expoConfig?.extra` directly in the component** — simple but hard to mock in Jest (jest-expo's transformer wraps `expo-constants` in a way that resists standard `jest.mock` overrides).
2. **Extract `src/lib/appConfig.ts` (chosen)** — thin module that reads `Constants.expoConfig.extra` once at module load and exports typed `legalConfig`, `supportConfig`, `appVersion`. Tests mock `@/lib/appConfig` directly with `jest.mock`. Pros: mockable, typed, single source of truth. Cons: values are static at module load time (fine — URLs never change during an app session).

### Decision

- **Locale**: Option B (custom Zustand locale store). Preference persists under `akin.locale.v1`. 'system' stays client-only; 'sv'/'en' mirror to `profiles.language` via `useLanguagePreference`. `seedLocaleFromProfile()` seeds the store on sign-in only if the local store is still at the 'system' default.
- **Blocked identifier**: Option B (denormalized column + trigger). Migration `0024_blocks_add_blocked_identifier.sql` owns the schema change. The `blocks.blocked_identifier` column is NOT NULL, populated by the trigger, and never updated after insert.
- **App config**: Extract `src/lib/appConfig.ts`. URL placeholders live in `app.config.ts → extra.legal / extra.support`. All three URLs are marked FIXME for replacement before public launch.

### Consequences

- Adding proper plural/format support later requires either adopting i18next (superseding this ADR) or extending the `t()` function with a mini-formatter. The current interpolation (`{{key}}` replace) handles the cases in scope.
- The `posts.language` bug (all posts defaulting to 'sv' regardless of UI locale) is fixed: `useCreatePost` now calls `getActiveLocale()` on insert.
- `blocked_identifier` on the blocks row will be stale if Akin ever introduces identifier changes (not planned). If that happens, a migration must backfill `blocks.blocked_identifier` from the new profile identifiers.
- Legal URLs (`app.config.ts`) must be replaced with real URLs before the App Store submission. Files: `app.config.ts` only — search for `FIXME` comment.

### Related work

Migrations: [0024](supabase/migrations/0024_blocks_add_blocked_identifier.sql).
pgTAP: [0024_blocks_add_blocked_identifier.test.sql](supabase/tests/0024_blocks_add_blocked_identifier.test.sql).
New modules: `src/features/locale/store/useLocaleStore.ts`, `src/features/locale/api/useLanguagePreference.ts`, `src/lib/i18n.ts` (modified), `src/lib/appConfig.ts`, `src/features/post/api/useMyBlocks.ts`, `src/features/post/api/useUnblock.ts`.

---

## ADR-019 — Phase 7 sign-off: trust & safety choices

Date: 2026-06-19
Status: Accepted
Decided by: Founder

### Context

Phase 7 delivered reporting, blocking, the keyword filter UX, the moderator dashboard (queue + detail + audit log viewer), the strike → suspend → ban lifecycle, the CSAM zero-tolerance path, and the Maestro E2E flows. Closing the phase required documenting the implementation choices, the deferrals, and the side-quest infrastructure that landed during closure but wasn't in the original brief.

### Implementation choices

1. **`moderate_report()` as a SECURITY DEFINER PL/pgSQL function.** All moderator actions (dismiss, hide, warn, suspend, ban, csam) run through a single function ([0020_moderate_report.sql](supabase/migrations/0020_moderate_report.sql)) that combines the consequence + the report status update + the audit-log write in one transaction. The function self-gates on `is_moderator()` and rejects empty reasons. There is no other code path that mutates reports or writes mod-action audit rows — making the audit log structurally non-bypassable.

2. **CSAM: audit-flag-now, export-later.** The CSAM branch performs the ban + content hide + audit row with `metadata->>'csam' = 'true'` so a future ECPAT/NCMEC export job can find these rows by querying the audit log. The dedicated `report-csam` Edge Function described in Task 7.6 implementation notes is **deferred** — for v1 the founder forwards manually based on the audit row. Engagement with ECPAT Sweden / NCMEC is also deferred until pre-launch (Phase 8.9 checklist).

3. **Strike auto-escalation as a separate migration (0023).** The original 0020 only incremented `strike_count` for `warn`; the Task 7.7 acceptance criteria (warn at strike 1 → suspend, warn at strike 2 → ban) was missed and caught during manual verification. Migration [0023_escalate_warn_action.sql](supabase/migrations/0023_escalate_warn_action.sql) replaces the function with the escalation logic and uses `SELECT strike_count + 1 ... FOR UPDATE` to avoid races between concurrent moderators. Audit labels distinguish manual from system-escalated: `user.warned` / `user.suspended.auto` / `user.banned.auto`, with `metadata.escalated_from = 'warn'` on the auto paths.

4. **Expired-suspension cleanup via pg_cron (0022).** Without a cleanup job, `profiles.status` stayed `'suspended'` forever once `suspended_until` lapsed. The public-read RLS policy `USING (status = 'active')` would have hidden the user's identifier from feed reads even after their lockout lifted. Migration [0022_clear_expired_suspensions_pgcron.sql](supabase/migrations/0022_clear_expired_suspensions_pgcron.sql) backfills the inconsistent rows and schedules an hourly cron. The client-side helpers (boot guard in `app/_layout.tsx` and `isSuspensionActive()` in `useAuthStore.ts`) handle the user experience in real time — this job is purely for DB consistency.

5. **Routing parity for banned and suspended.** The root layout in `app/_layout.tsx` swaps `<Slot />` for the relevant lockout screen based on profile status. `routeAfterSignIn()` mirrors the boot guard: returns early for `banned` (always) and for `suspended` _only while the timestamp is still in the future_. An expired suspension routes the user normally. This pair was the source of two bugs caught during Phase 7: (a) the original suspended path did a `router.replace` that raced with the swap and bounced the user to `/(auth)`; (b) the over-corrected fix stranded users whose suspension had lapsed. The current symmetry is pinned by the regression test suite in `useAuthStore.test.ts`.

### Deferrals

| Item                                                                  | Why deferred                                                 | Where it surfaces                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| Resend email templates for suspend/ban (Task 7.6 implementation note) | Not in the deliverables checklist; Resend not wired yet.     | Phase 8 hardening. Mod still has the audit log. |
| `report-csam` Edge Function (Task 7.6)                                | Spec explicitly defers it for v1; founder forwards manually. | Pre-launch (Phase 8.9) ECPAT engagement.        |
| ECPAT Sweden / NCMEC formal engagement                                | Spec says "before public launch," not before phase sign-off. | Phase 8.9 pre-launch checklist.                 |
| Mod action button labelling (e.g. "Warn (u, strike 2→3)")             | Not in spec; small UX polish.                                | Phase 8 polish.                                 |
| Email-based notifications for any moderation event                    | Not in spec.                                                 | Post-launch (v1.1).                             |

### Side-quest infrastructure landed during closure

These weren't in the Phase 7 brief but address real risks that surfaced during manual testing:

- **`pnpm db:reset` guardrail** ([scripts/db-reset-confirm.sh](scripts/db-reset-confirm.sh)) — typed-confirmation wrapper. `db:reset:force` is the CI/scripted escape hatch. Driven by an actual incident where `db:reset` was recommended as "easiest" and wiped a session's manual test state. CLAUDE.md §6 now explicitly forbids labelling destructive db commands as the convenient default.
- **Migration lint** ([scripts/migrate-lint.js](scripts/migrate-lint.js)) — wired into `pnpm migrate:lint` and the CI workflow. Blocks PRs that introduce `TRUNCATE`, unguarded `DELETE FROM`, `DROP TABLE` outside `NNNN_drop_*.sql`, and warns on `ALTER TABLE … DROP COLUMN`.
- **`ActiveConversationsPill`** — replaces the misleading red-dot tab badge with an always-visible capsule that shows "active in N of 3 conversations." Avoids the "looks like an unread badge" ambiguity that came up during testing. Rendered on the Write composer and on post detail.
- **`SuspendedScreen` redesign** — absolute datetime in user locale, support email, full-lockout copy that matches the implementation (the old "you can still read posts" copy was wrong). Built alongside the routing-race fix.
- **Open-report seed fixtures** — `seed.sql` now adds 3 pre-filed reports against fixture posts so manual moderation testing starts one click from action.

### Consequences

- The mod surfaces meet App Store guideline 1.2 (UGC moderation): report, block, filter, action, audit. Phase 7 is technically shippable for App Review purposes.
- The audit log is the only durable record of moderator actions; backups/PITR matter more than for other tables. Worth a note in the Phase 8 ops runbook.
- The `report-csam` deferral is the single largest "is this acceptable for launch" question. The founder must engage ECPAT before public launch (Phase 8.9 gate). If that engagement reveals integration requirements we haven't designed for, this ADR gets superseded by a follow-up that documents the chosen export mechanism.
- The strike escalation behaviour is now opaque to moderators in the UI — a "Warn" press at strike 2 silently bans. Worth a Phase 8 polish task to surface the next-step preview on the action button.

### Related work

Migrations: [0020](supabase/migrations/0020_moderate_report.sql), [0022](supabase/migrations/0022_clear_expired_suspensions_pgcron.sql), [0023](supabase/migrations/0023_escalate_warn_action.sql).
pgTAP: [0020_moderate_report.test.sql](supabase/tests/0020_moderate_report.test.sql), [0023_escalate_warn_action.test.sql](supabase/tests/0023_escalate_warn_action.test.sql).
Skills referenced: `.claude/skills/moderation/SKILL.md`, `database`, `security`, `i18n`.

---

## ADR-018 — Fix: age_verified_at not propagated from auth metadata to profile

Date: 2026-05-19
Status: Accepted
Decided by: Founder

### Context

The RLS INSERT policy on `public.posts` requires `profiles.age_verified_at IS NOT NULL`. The `signUp()` call correctly passes `age_verified_at` in `raw_user_meta_data`, but the `handle_new_user` trigger (migration 0001) created profiles with `age_verified_at = NULL`. Every post INSERT was silently rejected by RLS and surfaced as a generic "something went wrong" error.

### Decision

Migration 0016 replaces `handle_new_user` to read `age_verified_at` from `NEW.raw_user_meta_data` at profile creation time. It also backfills existing profiles where the column is still NULL but the metadata value is present (dev/staging accounts).

### Consequences

New signups will have `age_verified_at` set immediately. Existing dev accounts are backfilled. No client change needed — `signUp()` already sends the value.

---

## ADR-017 — Feed preference persistence: AsyncStorage via Zustand `persist`

Date: 2026-05-19
Status: Accepted
Decided by: Founder

### Context

Task 5.8 requires the user's chosen feed sort and category filter to persist across app launches. The data is non-sensitive (no PII, just UI preference) so encrypted storage is overkill. Phase 5 introduced `useFeedStore` (Zustand) with `sort`, `minSpice`, `activeCategory` — previously in-memory only.

### Options considered

1. **`expo-secure-store`** — already a dependency. Encrypted; intended for tokens. Overkill for a sort dropdown; not designed for arbitrary JSON payloads. iOS keychain has a documented size limit (~4KB per entry) and slow access.
2. **`@react-native-async-storage/async-storage`** — community-standard plaintext key/value store, Expo-supported, the recommended persistence backend for Zustand's `persist` middleware. New top-level dependency.
3. **Server-side preference column on `profiles`** — needs a migration, a write on every sort change, and adds latency. Wrong fit for a screen-local UI knob.

### Decision

Install `@react-native-async-storage/async-storage` and wire it to `useFeedStore` via Zustand `persist` + `createJSONStorage`. The same backend powers a new `useUiPrefsStore` for the one-shot "has seen create-post guidelines" flag.

Storage keys:

- `akin.feedPrefs.v1` — sort, minSpice, activeCategory
- `akin.uiPrefs.v1` — hasSeenCreateGuidelines

The `v1` suffix lets us bump the key when the shape changes rather than writing JSON-migration code.

### Consequences

- ✅ Standard, well-supported persistence for non-sensitive prefs across both platforms.
- ✅ `partialize` ensures only data fields persist, not action methods.
- ⚠️ Adds one runtime dep. Sentry/PostHog and most RN apps already pull it transitively.
- ⚠️ AsyncStorage is plaintext. We must never persist anything sensitive here — tokens stay in `expo-secure-store`. Code review must enforce that boundary.

---

## ADR-016 — Feed pagination: cursor over offset

Date: 2026-05-19
Status: Accepted
Decided by: Founder

### Context

Phase 5 Task 5.1 specified cursor-based pagination for the feed query, but the initial implementation used `.range(offset, offset+20)`. With offset pagination, any insert between page fetches shifts every subsequent row by one — the user sees the same post twice (or skips one) when scrolling. The feed is publicly writable, so inserts during a scroll session are routine, not an edge case.

### Options considered

1. **Offset pagination (`.range(start, end)`)** — trivial to implement; PostgREST built-in. Suffers from row shifting on concurrent inserts. Late inserts at the top push everything down and corrupt the cursor.
2. **Cursor on `(sort_column, id)`** — stable under concurrent inserts: each page is defined by "the row immediately past `(value, id)`," not "rows N through N+20." Slightly more code; needs an `id` tiebreaker because `created_at` / `comment_count` / `average_spice_level` are not unique.
3. **Realtime subscription + local merge** — overkill for a feed surface where the product model is pull-to-refresh, not push.

### Decision

Cursor pagination keyed on `(sort_column, id)` with strict-less-than tuple comparison via PostgREST `or=(col.lt.X,and(col.eq.X,id.lt.Y))`. The `id` tiebreaker guarantees a total order even when the primary sort column has duplicates.

For `spice` (DESC NULLS LAST), the cursor's value can be `null`. When that happens, all remaining rows are also `null` (NULLS LAST), so we degrade to a simple `is(col, null).lt(id, cursor.id)` predicate for subsequent pages.

### Consequences

- ✅ Stable pagination — late inserts no longer corrupt the user's scroll.
- ✅ Plays cleanly with the existing indexes on `(created_at, id)`, `(comment_count, id)`, `(average_spice_level, id)`.
- ⚠️ `getNextPageParam` now returns a `{ value, id } | null` instead of a number — slightly more memory per page, but trivial.
- ⚠️ Tests must mock `or` / `is` / `lt` / `limit` instead of `range`. Test helpers updated accordingly.

---

## ADR-015 — Account deletion: 30-day soft-delete with pg_cron purge

Date: 2026-05-18
Status: Accepted
Decided by: Founder

### Context

GDPR Article 17 (right to erasure) requires the ability to delete a user account and associated personal data. We need a deletion flow that is genuinely irreversible but also allows for a brief grace period (error recovery, App Store requirement to show the path is real).

### Options considered

1. **Immediate hard delete** — call `supabase.auth.admin.deleteUser()` at the moment the user confirms. Simple, but no grace period; App Store guidelines for 4.2 require the deletion to actually happen.
2. **Soft delete only** — mark `status = 'deleted'`, never actually purge. Violates GDPR erasure.
3. **30-day soft delete + nightly purge** — mark `status = 'deleted'` and `deleted_at = now()` immediately; a pg_cron job purges (calling `auth.admin.deleteUser()`) after 30 days. GDPR compliant, App Store compliant, provides an accidental-deletion safety net.

### Decision

Option 3. A Supabase Edge Function (`scheduled-purge`) is invoked nightly by pg_cron, fetches profiles with `status = 'deleted' AND deleted_at < now() - interval '30 days'`, and calls `auth.admin.deleteUser()` for each. The function is protected by a shared secret (`SCHEDULED_PURGE_SECRET`). The 30-day window is clearly disclosed in the in-app deletion flow.

### Consequences

- Easier: meets GDPR + App Store requirements without a complex undo flow.
- Harder: the pg_cron extension must be enabled in Supabase (it is in Pro plan). The secret must be rotated as part of security hygiene.
- Revisit: if we ever need real-time erasure (unlikely for a social app), we'd switch to immediate hard-delete or a webhook trigger.

---

## ADR-014 — Password reset: generic response regardless of email existence

Date: 2026-05-18
Status: Accepted
Decided by: Founder

### Context

When a user requests a password reset, naive implementations confirm whether the submitted email exists in the system. This is an account enumeration vulnerability: an attacker can discover which emails are registered.

### Options considered

1. **Expose the error** — show "No account found for that email." Leaks registration state.
2. **Generic response always** — always say "If that email is registered, you'll receive a link." Never confirm or deny existence.

### Decision

Option 2. `requestPasswordReset()` in the auth store ignores the Supabase error when the email isn't found and returns without setting `error` state. The UI always shows the same generic success message. This matches how Supabase's own auth dashboard behaves.

### Consequences

- Easier: no account enumeration.
- Harder: users with a typo in their email get no feedback. Acceptable trade-off for an anonymous app where the email is private anyway.

---

## ADR-013 — Onboarding: onboarded_at column instead of deriving from anonymous_identifier

Date: 2026-05-18
Status: Accepted
Decided by: Founder

### Context

Phase 3 implied onboarding completion by checking whether `anonymous_identifier` was set and non-pending. This is fragile: it ties two concerns together (identifier generation and onboarding completion) and makes the routing logic hard to reason about.

### Options considered

1. **Derive from anonymous_identifier** — `onboarding_complete = identifier is set and not pending`. Fragile; breaks if identifier generation is retried.
2. **Explicit `onboarded_at` column** — a nullable `timestamptz` that is set when the user taps "This is me" and completes the 3-screen onboarding pager. Null means not yet onboarded.

### Decision

Option 2. Migration `0013_add_onboarded_at.sql` adds `onboarded_at timestamptz` to `profiles`. `completeOnboarding()` in the auth store writes `onboarded_at = now()`. `routeAfterSignIn()` checks this column first, then falls back to identifier state for the identifier reveal screen.

### Consequences

- Easier: routing logic is explicit and readable. Onboarding can be reset for A/B tests by nulling the column.
- Harder: one more column to carry in the Profile type and seed data.

---

## ADR-012 — PostHog analytics: anonymous distinct ID, EU host, no identity linkage

Date: 2026-05-18
Status: Accepted
Decided by: Founder

### Context

Task 3.8 wires PostHog EU as the behavioural analytics backend. PostHog requires a stable `distinct_id` per device/user to group events into sessions. The choice of how to generate and store that ID carries privacy and anonymity implications that are central to Akin's product identity.

### Options considered

1. **Use `auth.uid()` as the distinct ID** — trivial to implement; allows cross-referencing analytics events with database records. Violates Akin's anonymity guarantee (Rule 8): auth.uid() is an internal identity anchor. PostHog support engineers with project access could, in theory, correlate user behaviour with account data. ✗

2. **Generate a random UUID per device, persisted in `expo-secure-store`** — distinct from auth.uid(); survives app restarts; lost on uninstall (acceptable — analytics sessions do not need to span reinstalls). Cannot be correlated with auth.uid() at rest. ✓

3. **Use a per-session UUID (in-memory only)** — simpler but sessions split every app restart, making funnel analysis impossible. ✗

### Decision

Option 2. `getDistinctId()` in `src/lib/analytics.ts` generates a RFC 4122 v4 UUID on first call, persists it under the key `posthog_distinct_id` in `expo-secure-store`, and returns the stored value on all subsequent calls. The function accepts no argument — there is no code path that could pass an external user ID. This is enforced structurally, not by convention.

Additional constraints applied:

- EU data residency: `host: 'https://eu.posthog.com'`
- Session replay: `enableSessionReplay: false` (no screen recordings)
- PII scrubbing: all event props pass through `scrub()` from `src/lib/logger.ts` before capture

### Consequences

- Analytics sessions survive app restarts but not reinstalls — acceptable for behavioural analytics.
- PostHog data cannot be joined to Supabase user records without manual cross-referencing, which requires access to both systems and is therefore an auditable action.
- The anonymity guarantee (CLAUDE.md Rule 8) is preserved in the analytics layer.
- If we ever need to persist analytics identity across reinstalls we would need a server-generated opaque token — revisit this ADR at that point.

---

## ADR-011 — Phase 2: database schema, triggers, and pgTAP suite

Date: 2026-05-17
Status: Accepted
Decided by: Founder

### Context

Phase 2 delivers the full Postgres backend: 12 migrations (profiles → participation limits → spice votes → content filter → audit log → blocks → feature flags → user roles → reports → identifier words → Edge Function plumbing → seed data), 13 pgTAP test files (76 assertions), and generated TypeScript types. Four non-obvious decisions are recorded below.

### Decision 1 — SECURITY DEFINER + current_user guard for internal triggers

**Problem.** Several triggers update server-managed columns (e.g. `active_post_count`, `comment_count`, `participant_count`). Guard triggers block `authenticated` clients from writing those columns directly. But when an internal trigger fires (e.g. `add_op_as_participant` increments `active_post_count`), it runs in the same session and would be blocked by the guard — causing a recursive failure.

**Options considered.**

1. GUC flag (`set_config('akin.internal', 'true', true)`) — clients could set the same flag and bypass guards. ✗
2. SECURITY DEFINER on internal triggers + `current_user NOT IN ('authenticated', 'anon')` guard — internal triggers run as `postgres` and pass the guard; client writes fail. ✓
3. Separate `BEFORE UPDATE` trigger with column allow-list — requires maintaining an explicit list; more brittle. ✗

**Decision.** All internal trigger functions (`add_op_as_participant`, `decrement_active_on_full`, `enforce_participation_limits`, `enforce_post_creation_limit`, `maintain_comment_count`, `maintain_spice_averages`) are marked `SECURITY DEFINER SET search_path = public`. Guard functions (`enforce_profile_update_columns`, `enforce_post_update_columns`) bypass with `IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;` at the top.

### Decision 2 — Participation limit ordering: increment before updating participant_count

**Problem.** `enforce_participation_limits` must: (a) insert the new participant into `post_participants`, (b) increment `profiles.active_post_count` for the new commenter, (c) increment `posts.participant_count`. Step (c) fires `decrement_active_on_full` (AFTER UPDATE) when `participant_count` reaches 4. If (c) runs before (b), the 4th commenter is decremented from 0 → −1, violating the `active_post_count >= 0` CHECK constraint.

**Decision.** The order inside `enforce_participation_limits` is strictly: INSERT into `post_participants` → UPDATE `profiles` (increment) → UPDATE `posts` (increment). A comment in the migration documents this dependency.

### Decision 3 — Content filter: word-boundary regex instead of LIKE

**Problem.** `LIKE '%slur%'` causes false positives (e.g. `spic` in `spice`). A word-boundary check is required.

**Options considered.**

1. `LIKE '%word%'` — false positives on substrings. ✗
2. PostgreSQL `\mword\M` regex — true word-boundary anchors, works natively in Postgres. ✓
3. Full-text dictionary approach — overkill at this stage; harder to maintain custom slur list. ✗

**Decision.** Filter uses `v_lower ~ ('\m' || lower(v_word) || '\M')`. The slur/contact-info word lists are in `identifier_words` table (kind = `blocked_slur` / `blocked_contact`), editable without a migration.

### Decision 4 — Seed data: all bulk posts pre-seeded as full (participant_count = 4)

**Problem.** Seeding 50 realistic posts (10 per user) is incompatible with the `active_post_count <= 3` CHECK constraint. The constraint correctly limits live activity; the seed just needs plausible historical data.

**Decision.** All 50 bulk posts are inserted with `participant_count = 4` (is_full = true) and `active_post_count` manually set to 0 after insert. Only Iris's 3 test-fixture posts (deterministic UUIDs `000…f02/f03/f04`) are active. Five triggers that would reject bulk inserts are disabled for the seed and re-enabled at the end.

### Consequences

- The `current_user` guard is now the canonical Akin pattern for distinguishing internal trigger calls from client calls. All new tables that need server-managed columns should follow this pattern.
- The participation limit trigger ordering is fragile: a developer who reorders the three UPDATE/INSERT statements will reintroduce the −1 bug. The comment in 0005 is load-bearing.
- The word-boundary regex requires PostgreSQL's `~` operator; SQLite-based offline tests are not possible for content filtering.
- Seed data must be maintained alongside schema changes — if `posts` or `post_participants` columns change, `seed.sql` needs updating.

---

## ADR-010 — Phase 1 completion: logger, pre-commit hooks, MSW ESM fix

Date: 2026-05-17
Status: Accepted
Decided by: Founder

### Context

Tasks 1.10 and 1.11 complete Phase 1. Three decisions are recorded here.

**Logger design (Task 1.10).** A project-wide structured logger was needed from day one so that no call site ever reaches for `console.*` directly. The logger also needed to scrub PII before any output.

**Pre-commit hooks (Task 1.11).** Commits that would fail CI must be caught locally to keep the feedback loop short.

**MSW 2.x + pnpm hoisted ESM resolution fix.** After pulling Tasks 1.4–1.9, all three test suites failed with "Cannot use import statement outside a module" originating from MSW transitive deps.

### Options considered — logger

1. **Export `scrub` + `logger.*`** — testable independently; Sentry swap-in is mechanical. ✓
2. **Logger only, scrub internal** — harder to unit-test the scrub logic directly.
3. **Use a third-party structured-logging library** — overkill for current needs; adds a dep.

### Options considered — hooks

1. **Husky 9 + lint-staged (staged files only)** — fast (< 5s), catches ESLint + Prettier, typecheck on push. ✓
2. **Run full Jest in pre-commit** — too slow; CI handles it.
3. **lefthook** — not widely known; Husky is the ecosystem standard.

### Options considered — MSW ESM fix

1. **moduleNameMapper to pin MSW to `lib/` CJS output** — already in place but not sufficient alone.
2. **Add ESM-only transitive deps to `transformIgnorePatterns` allowlist** — works for top-level packages (`rettime`, `until-async`).
3. **Pin nested ESM-only package via moduleNameMapper** — required for `@open-draft/deferred-promise@3` (nested in `msw/node_modules/`); pinned to the hoisted v2 CJS build which exports the same API.

### Decision

- **Logger**: exports `scrub()` (named, testable) + `logger.{info,warn,error}`. All three methods call `scrub(context)` before output. `console.*` ESLint rule remains `error` everywhere in `src/`; the three `console.*` calls inside `logger.ts` have justified `eslint-disable-next-line` comments. PII key list: `email`, `password`, `token`, `authorization`, `ip`, `body`, `title`, `notes` (case-insensitive). Sentry integration deferred to Phase 3 — `PHASE 3` comments mark the exact lines.
- **Hooks**: Husky 9 + lint-staged. `pre-commit` → `lint-staged` (ESLint + Prettier on staged files). `pre-push` → `pnpm typecheck`. Config in `package.json`.
- **MSW ESM fix**: added `rettime` and `until-async` to `transformIgnorePatterns` allowlist; pinned `@open-draft/deferred-promise` to hoisted CJS via `moduleNameMapper`.

### Consequences

- Every future log call goes through `logger.*` — PII cannot accidentally leak to Sentry/console.
- Pre-commit catches lint/format regressions before they hit CI.
- MSW test infrastructure is stable; future MSW upgrades may require re-checking the ESM dep chain.
- If `@open-draft/deferred-promise` v2 and v3 diverge in API, the pin may need revisiting.

---

## ADR-009 — Jest + RTL setup and react-native 0.83 Flow workaround (Task 1.5)

Date: 2026-05-01
Status: Accepted
Decided by: Founder

### Context

Task 1.5 sets up Jest, React Native Testing Library, MSW, and the `renderWithProviders` helper. Three non-obvious decisions were made during setup.

### Options considered

**MSW version:**

1. **MSW 2** — modern ESM-first API (`http`, `HttpResponse`). Incompatible with Jest's CommonJS transform: MSW 2 and all its transitive dependencies are ESM-only. Trying to transform them via Babel causes cascading failures.
2. **MSW 1** — CJS-first (`rest`, `ctx`). Works with `jest-expo` and Babel without any extra config. Matches the API shown in the testing skill.

**RTL matchers:**

1. **`@testing-library/jest-native`** — deprecated as of RTL 12.4. Shows a deprecation warning on install.
2. **`@testing-library/react-native` built-ins** — RTL 13 auto-loads `extend-expect` when the main package is imported. No separate package needed.

**react-native 0.83 Flow compatibility:**

- `react-native@0.83.6` introduced `const T:` in Flow generic type parameters in `ViewConfigIgnore.js`. `@babel/parser@7.28` does not support this syntax.
- jest-expo transforms react-native source files via Babel, so the parse fails.
- Workaround: a custom Jest transformer (`src/__mocks__/ViewConfigIgnoreTransformer.js`) is registered for `ViewConfigIgnore\\.js$` files, bypassing Babel and returning a simple stub. Remove when `@babel/parser` adds support.

### Decision

Use MSW 1. Use RTL 13's built-in matchers (no `jest-native`). Apply the custom transformer workaround for `ViewConfigIgnore.js`.

### Consequences

- Upgrade path: when MSW 2 + Jest ESM support matures, migrate `supabase-mock.ts` to the new `http`/`HttpResponse` API and remove the MSW 1 entry from `DECISIONS.md`.
- When `@babel/parser` or `babel-preset-expo` adds support for Flow `const T:` generics, remove `ViewConfigIgnoreTransformer.js` and the `transform` entry from `jest.config.ts`.
- The custom transform is matched by file name, not package version — it's safe to leave in until removed.

---

## ADR-008 — Folder scaffold and path alias strategy (Task 1.4)

Date: 2026-05-01
Status: Accepted
Decided by: Founder

### Context

Task 1.4 establishes the canonical directory structure and path aliases before any feature code lands. The goal is to lock in layout conformance and ensure aliases work in three environments: TypeScript (type-checker), Metro (bundler), and Jest.

### Options considered

1. **`babel-plugin-module-resolver` + `tsconfig.paths` + `moduleNameMapper`** — three configs, each targeting one runtime. Verbose but explicit; each resolver is independently verifiable.
2. **`tsconfig.paths` only** — TypeScript is happy, but Metro and Jest still use node resolution by default, so `@/…` imports would fail at runtime and in tests.
3. **`expo/tsconfig.base` absolute imports** — Expo's base config doesn't support `@/` style by default; would require the same `paths` additions anyway.

### Decision

Use all three in concert:

- `tsconfig.json` `paths` for TypeScript type resolution.
- `babel.config.js` with `babel-plugin-module-resolver` for Metro runtime resolution.
- `jest.config.ts` `moduleNameMapper` for Jest.

Alias set: `@/components`, `@/features`, `@/lib`, `@/i18n`, `@/theme`, `@/types` — mapping to `./src/<name>`.

### Consequences

- All three must stay in sync when a new top-level alias is added.
- `ts-node` is a dev-only dependency required to parse `jest.config.ts` as TypeScript.
- Stub alias-resolution tests (and their `__stub__.ts` files) are deleted once CI is green, per the task brief.

---

## ADR-007 — pnpm `node-linker=hoisted` and minimal babel.config.js

Date: 2026-05-02
Status: Accepted
Decided by: Founder
Supersedes part of ADR-005 (the implicit assumption of pnpm's default isolated linker)

### Context

Bundling Expo Router with the project's default pnpm layout failed at:

```
expo-router/_ctx.ios.js: Invalid call at line 2: process.env.EXPO_ROUTER_APP_ROOT
First argument of `require.context` should be a string denoting the directory to require.
```

`babel-preset-expo` ships an Expo Router transform that inlines `process.env.EXPO_ROUTER_APP_ROOT` into a string at build time. The transform is gated on `hasModule('expo-router')` (which is `require.resolve('expo-router')` from the preset's own location).

With pnpm's default isolated linker, `babel-preset-expo` is a transitive dep of `expo` and is not hoisted to the project's flat `node_modules/`. When Babel resolves `'babel-preset-expo'`, Node walks up the filesystem, fails to find it in the project, and lands on a stray `/Users/ivan/node_modules/babel-preset-expo@13.2.3` (an unrelated artifact in the user's home directory). From that stray location, `require.resolve('expo-router')` fails — so the Expo Router plugin is silently skipped, the `require.context()` call reaches Metro untransformed, and bundling fails.

The project also previously had no `babel.config.js`, so `babel-preset-expo` was not loaded at all. That's a separate, prerequisite fix: every Expo project needs a `babel.config.js` that lists `babel-preset-expo`.

### Options considered

1. **`.npmrc` with `node-linker=hoisted`** — pnpm produces an npm-style flat `node_modules/`. All deps win the walk-up race against any stray parent `node_modules/`. This is what `create-expo-app` generates for pnpm and what Expo docs recommend.
2. **Targeted `public-hoist-pattern[]=babel-preset-expo`** — selectively hoists just the babel preset. Smaller change, but other Expo tooling (Metro plugins, `@expo/cli` internals) is also resolved by name from outside the `.pnpm` store and could fail in the same way as we add features. Whack-a-mole.
3. **Custom resolver in `babel.config.js`** — programmatically locate the preset inside `.pnpm/...`. Fragile (peer-suffix hashes change between installs), and doesn't help any other Expo tool that does name-based resolution.
4. **Add `babel-preset-expo` as a top-level devDependency** — would hoist it, but adds a "phantom" direct dep that the project doesn't actually use directly; deviates from the Expo conventions.

### Decision

Option 1. `.npmrc` contains the single line `node-linker=hoisted`. A minimal `babel.config.js` lists `babel-preset-expo` as the only preset.

### Consequences

- Bundling works on iOS, Android, and web. Verified with `npx expo export --platform ios --dev` and `--platform android --dev`.
- Phantom-dependency prevention from ADR-005 is partially relinquished: any code in this project can `import` from any transitive dependency without declaring it. ESLint can compensate via `import/no-extraneous-dependencies` if we want a soft guard later.
- The `.pnpm/` content-addressable store is still used; install speed and disk savings from pnpm are preserved.
- The stray `/Users/ivan/node_modules/` is unrelated to this project but will silently break any pnpm project run from a subdirectory of `~`. Worth investigating separately, but out of scope here — `node-linker=hoisted` makes us immune to it because the project's own `node_modules/` always wins resolution now.
- If we ever go to a monorepo or want strict-mode pnpm back, revisit this ADR with whatever Expo's published guidance is at that point.

---

## ADR-006 — Metro resolver workaround for react-native-screens 4.23.0 codegen bug

Date: 2026-05-02
Status: Superseded by ADR-007 — see "Postscript" below
Decided by: Founder

### Context

The Metro bundle was failing with:

```
react-native-screens/src/fabric/ScreenStackHeaderSubviewNativeComponent.ts:
Unknown prop type for "type": "undefined"
```

This was originally diagnosed as a bug in `@react-native/codegen@0.83.6`'s TypeScript parser, choking on `CT.WithDefault<Union, 'literal'>` patterns in `react-native-screens@4.23.0`'s Fabric specs.

### Decision (now reverted)

Added a `resolveRequest` shim in `metro.config.js` that redirected any `react-native-screens/src/fabric/**/*.ts` resolution to the pre-built `lib/commonjs/fabric/**/*.js` sibling, on the theory that the compiled CJS form would skip `babel-plugin-codegen` entirely.

### Postscript — why this was wrong

The diagnosis was incorrect. The current `@react-native/codegen@0.83.6` parser handles `CT.WithDefault<Union, 'literal'>` correctly (verified by parsing every `src/fabric/**/*.ts` in the package directly — all 23 files succeed). The actual root cause was the stray `~/node_modules/babel-preset-expo@13.2.3`, which Babel was resolving to instead of the project's `babel-preset-expo@55.0.18`. That ancient preset shipped an old codegen parser that genuinely failed on this pattern.

Worse, the workaround actively broke runtime: `lib/commonjs/fabric/*.js` files don't carry an inlined view config, so when the JS proxy reaches `codegenNativeComponent('RNSSafeAreaView', { interfaceOnly: true })` at runtime it falls back to `requireNativeComponent`. Per the inline comment in `react-native/Libraries/Utilities/codegenNativeComponent.js`, that fallback is **not available in Bridgeless mode** (which SDK 55 + New Arch uses by default). The visible failure was a "View config not found for component `RNSSafeAreaView`" red box on first render via `<Stack />` from expo-router.

### Resolution

`metro.config.js` removed. ADR-007 (`.npmrc` with `node-linker=hoisted`) is the actual fix — once the right `babel-preset-expo` resolves, the codegen plugin inlines view configs correctly and there's nothing left to work around. Bundles still work on iOS / Android / web, and runtime now works because view configs are present at first render.

Lesson kept here for history: when an Expo / Metro / codegen error looks like a third-party-library bug, first verify which copy of `babel-preset-expo` Babel is actually loading. A stray top-level `~/node_modules/` will silently win Node's walk-up resolution under any pnpm project that doesn't use `node-linker=hoisted`.

---

## ADR-006 — Design system: colour palette, typography, and visual identity

Date: 2026-04-30
Status: Accepted
Decided by: Founder (via design handoff — akin-handoff.zip)

### Context

Phase 3 Task 3.2 required colour and typography tokens. The UI skill originally contained placeholder values (aubergine brand primary, GT Sectra display font) pending a design decision. The founder delivered a Claude.ai Design handoff in April 2026 that specifies the final visual language.

### Options considered

1. **Placeholder tokens from UI skill v1** — `brand.primary: #5B2A4D` (aubergine), `brand.accent: #C2664A` (terracotta), `displayFamily: 'GT Sectra'` (paid licence). Used in skill file before handoff.
2. **Tokens from design handoff** — `brand.primary: #2C4D55` (Dark Slate Grey / teal), no terracotta accent, `displayFamily: 'Source Serif 4'` (open-source). Confirmed via screens-ds.jsx and tokens.jsx in the handoff.

### Decision

Use the design-handoff tokens. The brand primary is **teal (#2C4D55)** — not aubergine. No terracotta accent colour; rust (#B54C26) exists only for the spice-flame system. Display font is **Source Serif 4** (Google Fonts, free). Body font is **Inter**. Mono font is **JetBrains Mono**, used exclusively for anonymous identifiers and character counters.

### Consequences

- GT Sectra is not needed. No font licence cost at v1.
- The aubergine/terracotta palette from the old UI skill placeholder is retired. Any agent session that recalls "aubergine primary" should disregard it.
- The colour token structure in `src/theme/colors.ts` follows the handoff exactly (see `.claude/skills/ui/SKILL.md` §2).
- Rust colour must never appear outside the spice-vote UI. Blue (#788BFF) must never appear outside the "you" identifier chip. Teal is the only interactive accent.

---

## ADR-005 — Foundation project setup choices

Date: 2026-04-28
Status: Accepted
Decided by: Founder

### Context

Phase 1 Task 1.1 establishes the project scaffold. Several tooling choices were made that future sessions should know about.

### Options considered

1. **pnpm vs npm/yarn** — pnpm chosen for strict phantom-dependency prevention, faster installs via hard links, and first-class Expo support. Locked at 8.15.9 (the version on the development machine).
2. **Expo Router at scaffold time vs Phase 3** — wired at Task 1.1 on the founder's request, rather than deferring to Phase 3. This is fine; the Phase 3 work will build on top of this entry point rather than add it from scratch.
3. **Bundle identifier** — `com.ourakin.app` rather than `com.akin.app`, because App Store and Play Store require globally unique bundle identifiers and the `akin` namespace was likely taken.
4. **SDK 55 + RN 0.83** — `create-expo-app` defaulted to SDK 54 / RN 0.81, which did not meet the CLAUDE.md requirement. Upgraded to SDK 55.0.18 / RN 0.83.6 using `expo install --fix`.

### Decision

Use pnpm 8.15.9, Expo SDK 55.0.18, React Native 0.83.6, Expo Router (installed at scaffold time), bundle ID `com.ourakin.app`.

### Consequences

- pnpm-lock.yaml is the source of truth for dependencies. Never delete it.
- All future `expo install` calls must use pnpm (e.g. `pnpm exec expo install <pkg>`), not npm.
- Expo Router is live from commit 1; Phase 3 adds the full navigation structure rather than introducing the dependency.

---

## ADR-004 — Skipping TDD for project initialisation (Task 1.1)

Date: 2026-04-28
Status: Accepted
Decided by: Founder (per Phase 1 task brief)

### Context

CLAUDE.md §2 rule 3 mandates TDD — failing test first, always. The Phase 1 task brief explicitly exempts Task 1.1 (project initialisation) from this rule. This ADR documents the exemption so future sessions understand it is intentional, not an oversight.

### Options considered

1. **Skip TDD for 1.1 only** — the task is project scaffolding; there is no behaviour to test before the scaffold exists.
2. **Force TDD anyway** — write a shell test that asserts the project directory exists after `create-expo-app`. Provides zero value and adds friction.

### Decision

TDD skipped for Task 1.1 only. Exemption is a one-off. From Task 1.2 onward, TDD is mandatory without exception.

### Consequences

- This exemption does not set a precedent. Any future "it's just scaffolding" reasoning to skip TDD must be challenged.
- The self-review checklist for 1.1 substitutes for the TDD step: `pnpm typecheck` passing and both simulators launching serves as the functional proof.

---

## ADR-003 — TDD as a hard rule, not a guideline

Date: 2026-04-25
Status: Accepted
Decided by: Founder

### Context

Akin is being built by a solo founder using AI coding agents. There is no peer reviewer for code. The risk of subtle bugs slipping in — especially in RLS policies and the participation-limit triggers — is the single biggest threat to the product's correctness. The agent is good at producing tests; if asked to.

### Options considered

1. **Optional tests** — write tests for the hard stuff, skip the easy parts.
2. **TDD always** — failing test before any implementation, no exceptions.
3. **Tests after implementation** — write the code, then write tests to lock it in.

### Decision

TDD always. The agent writes the failing test first, the founder reviews the test, then the agent implements. This is enforced by the task brief template (every task includes a "Tests to write first" section) and by the self-review checklist.

### Consequences

- Slower per-task. Each task takes ~30% longer than "write code, ship it."
- Tests become the requirements specification. The acceptance criteria gets baked in.
- Refactoring becomes safe. The whole point of having tests is being able to change the code without fear.
- The test suite becomes the trust contract between the founder and the agent. If tests pass, ship. If they don't, the agent didn't do its job.

---

## ADR-002 — Supabase as the only backend

Date: 2026-04-25
Status: Accepted
Decided by: Founder

### Context

Akin's data is highly relational with hard invariants (max 4 participants, max 3 active posts, single spice vote per user per post, identifier uniqueness). The choice of backend determines how those invariants are enforced. Options were Firebase, Supabase, or a custom Node + Postgres backend.

### Options considered

1. **Firebase / Firestore** — fast to start. Document model fits poorly with the relational invariants. "Max 4 participants" requires Cloud Functions and is racy. Vendor lock-in.
2. **Supabase** — Postgres under the hood. Constraints, triggers, and RLS handle the invariants natively. EU hosting. Realtime built in. No lock-in (it's just Postgres).
3. **Custom Node + Postgres** — total control. Adds weeks of infrastructure work. No payback for v1 scope.

### Decision

Supabase, EU region. Postgres for primary data. RLS for authorisation. Triggers for invariants. Edge Functions for custom logic (identifier generation, abuse detection).

### Consequences

- All authorisation lives in the database. The client cannot be trusted, and we don't have to.
- Triggers and RLS policies are now product-critical code. They get pgTAP tests and human expert review.
- If Supabase ever becomes a problem (pricing, region, outages), the migration path is "stand up our own Postgres," which is mechanical, not a re-architecture.

---

## ADR-001 — AI-agent-first development

Date: 2026-04-25
Status: Accepted
Decided by: Founder

### Context

Akin is a self-funded solo project. A traditional contracted build would consume 300–600k SEK before launch — beyond the available capital and beyond the founder's time tolerance. AI coding agents (Claude Code, Cursor) have matured to the point where a single founder can ship production-quality features at 5–10x the velocity of manual coding.

### Options considered

1. **Solo founder writing all code by hand** — predictable quality, slow, expensive on opportunity cost.
2. **Hire a contractor or junior dev** — fast to start, slow to align on taste, expensive (~60–100k SEK/month).
3. **AI-agent-first, founder as architect/reviewer** — fast, cheap (~$100–200/month), demands strong review discipline from the founder.

### Decision

AI-agent-first. Claude Code Max as primary, Cursor Pro as secondary. Founder is the architect and reviewer; agents implement. Critical paths (auth, RLS, payments) get paid human expert review on top.

### Consequences

- Per-feature cost falls from days to hours.
- Code quality depends on the founder's review discipline. The self-review checklist is now load-bearing.
- The risk of subtle AI-introduced bugs is real. Mitigated by: TDD (ADR-003), self-review checklist, paid expert review on critical paths, and `CLAUDE.md` rules that constrain the agent.
- Architecture documentation becomes the agent's memory between sessions. `ARCHITECTURE.md` and these ADRs are part of the build, not an afterthought.

---

## (template — copy this for new entries)

## ADR-NNN — Short title

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by ADR-XXX
Decided by: …

### Context

### Options considered

### Decision

### Consequences
