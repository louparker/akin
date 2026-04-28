# Phase 7 — Trust & safety

> **Goal:** the reporting flow, blocking flow, moderator dashboard, and audit log all work end-to-end. The keyword filter from Phase 2 is exercised. By the end of this phase, the app is ready for App Store review under Apple's UGC guideline 1.2.
>
> **Estimated duration:** 5–7 days.
>
> **Prerequisites:** Phase 6 signed off.
>
> **Skills referenced:** `moderation` (read end-to-end), `database`, `security`, `i18n`.

---

## Phase deliverables — sign-off checklist

- [ ] Report a post or comment from the action sheet.
- [ ] Block a user from the action sheet; their content disappears.
- [ ] Moderator dashboard with queue, detail view, action buttons.
- [ ] Audit log written for every moderator action.
- [ ] CSAM zero-tolerance path: hide + ban + ECPAT/NCMEC report.
- [ ] Keyword filter user-visible message tested with real attempts.
- [ ] Strikes lifecycle (warn / suspend / ban) functional.
- [ ] Maestro E2E: report → moderator dashboard → action.

---

## Task 7.1 — Report flow

**Context:** `.claude/skills/moderation/SKILL.md` §3.

**Goal:** the user-facing report submission, end-to-end.

**Acceptance criteria:**

- Long-press a post or comment opens the action sheet (already wired stub in Phases 5–6 — implement now).
- "Report" → opens the report-reason picker as a modal.
- Reason options: harassment, hate, spam, sexual, threat, off_topic, other.
- "other" requires a notes field (max 500 chars).
- Submit calls `supabase.from('reports').insert(...)`.
- Acknowledgment toast: "Thanks. Our team will take a look." NO status updates afterward.
- Rate limit (5/hour) surfaces the right message if hit.
- Report on a `user` target type (long-press a comment → "Report this person") works.

**Tests to write first:**

- Component test: action sheet entries.
- Component test: reason picker required selection.
- Component test: "other" requires notes ≥ 1 char.
- Component test: submit invokes the right mutation.
- Component test: rate-limit error renders the correct bilingual message.

**Implementation notes:**

- The report mutation does NOT do optimistic updates — there's nothing visible to update for the reporter.
- After submit, the action sheet should NOT mark the content as "reported" persistently. Reduces report-bombing.

**Self-review (security lens):**

- [ ] Reporter identity not leaked anywhere user-visible.
- [ ] Rate limit honoured.
- [ ] No PII in analytics (track only `report_filed` with category, no IDs).

**Done when:** report submission works for posts, comments, and users; row appears in `reports` table.

---

## Task 7.2 — Block flow

**Context:** `.claude/skills/moderation/SKILL.md` §4.

**Goal:** users can block; blocked content disappears immediately.

**Acceptance criteria:**

- Action sheet "Block author" → confirm modal → insert into `blocks`.
- Confirm modal copy: "You won't see this person's posts or comments. They won't be told." (Bilingual.)
- After confirm: invalidate feed, post detail, and comment list queries → blocked content disappears.
- A "Blocked users" list in Settings (Phase 8) where the user can see and unblock — for now, the blocked list query is built and tested even if the UI lands in Phase 8.

**Tests to write first:**

- Component test: confirm flow.
- Mutation test: insert into blocks, invalidate the right queries.
- Integration test (against local Supabase): after block, blocker's feed query returns no rows from blocked.

**Implementation notes:**

- Phase 2 already enforces bidirectional invisibility via RLS — this is just the UI layer.
- Don't reveal "you've blocked X" anywhere outside Settings; respect the blocker's privacy.

**Self-review:**

- [ ] No way to block yourself (Phase 2 has the CHECK constraint; verify here).
- [ ] Both languages.

**Done when:** block → blocked user's posts immediately disappear from feed.

---

## Task 7.3 — Keyword filter user experience

**Context:** Phase 2 task 2.14; `.claude/skills/moderation/SKILL.md` §5.

**Goal:** when the keyword filter rejects a post or comment, the user sees a clear, bilingual, non-shaming message with a path to contact support.

**Acceptance criteria:**

- `CONTENT_FILTER_HIT` → "Your message couldn't be posted. If you think this is a mistake, contact support."
- `CONTACT_INFO_NOT_ALLOWED` → "Posts and comments can't include phone numbers, emails, or social handles."
- Both messages bilingual.
- "Contact support" button opens a mailto: with a redacted error code.
- Analytics event `content_filter_blocked` fired with the rule type (no content).

**Tests to write first:**

- Mutation test: P0010 surfaces the right message.
- Mutation test: P0011 surfaces the right message.
- Component test: contact support button opens the correct mailto.

**Implementation notes:**

- The error code in the mailto is a hash of the timestamp + user ID. Lets the founder look up the actual content in the moderation queue.

**Self-review:**

- [ ] No shaming language in either translation.
- [ ] No content in the analytics payload.

**Done when:** all tests pass; manual attempt with a phone number triggers the right path.

---

## Task 7.4 — Moderator role gating

**Context:** Phase 2 task 2.11.

**Goal:** the moderator dashboard is reachable only by users with the moderator role.

**Acceptance criteria:**

- `app/(moderator)/_layout.tsx` reads `is_moderator()` via RPC; redirects to feed if false.
- A small "Moderation" entry appears in Settings only for moderators.
- Even if a non-moderator deep-links to `/moderator/queue`, they're redirected.
- RLS already prevents non-moderators from reading `reports` etc. — verify.

**Tests to write first:**

- Routing test: non-moderator hitting the route is redirected.
- Routing test: moderator can access the layout.
- Integration test: non-moderator API call to read reports fails (RLS).

**Implementation notes:**

- Defence in depth: route guard + RLS. Either alone is insufficient.

**Self-review:**

- [ ] CRITICAL-PATH marker on the route guard.

**Done when:** all tests pass.

---

## Task 7.5 — Moderator queue screen

**Context:** `.claude/skills/moderation/SKILL.md` §6.

**Goal:** the list of open reports, sorted by age.

**Acceptance criteria:**

- `app/(moderator)/queue.tsx`.
- FlashList of open reports. Each row: target type, reason, age, reporter identifier (visible only to mods), 1-line preview of the content.
- Tapping a row → `/moderator/report/[id]`.
- Filter chips: All, Harassment, Hate, Sexual, Threat (the high-severity reasons surface first).
- Pull to refresh; queue depth in the header.
- Empty state: "No open reports."

**Tests to write first:**

- Component test: lists open reports.
- Component test: filter changes query.
- Component test: empty state renders.

**Implementation notes:**

- Sort: `created_at ASC` (oldest first — handle the longest-waiting reports first).
- Show the count of all open reports in the tab badge.

**Self-review:**

- [ ] Only moderator-visible information shown.
- [ ] Reporter identifier present (moderators need it).

**Done when:** queue shows real reports.

---

## Task 7.6 — Report detail + actions

**Context:** `.claude/skills/moderation/SKILL.md` §6.

**Goal:** moderator views a report with full context and takes an action.

**Acceptance criteria:**

- `app/(moderator)/report/[id].tsx`.
- Shows: target content (post or comment, full body), reporter identifier + history (count of prior reports filed by this reporter), target user identifier + history (prior reports against them, current strike count, account age).
- Action buttons: Dismiss, Hide content, Warn user, Suspend (7 days), Ban (permanent), CSAM (zero-tolerance path).
- Each action requires a confirmation modal with a "reason" notes field (mandatory).
- Action invokes a SECURITY DEFINER function (`moderate_report`) that performs the action AND writes to `audit_log` AND updates the report status.
- Bilingual reason notes (mod's choice).

**Tests to write first:**

- Component test: each action renders confirmation.
- Component test: dismissing without notes is rejected.
- Integration test: actioning a report updates target status, increments strike count if applicable, writes audit row.
- Integration test: CSAM action triggers the export Edge Function.

**Implementation notes:**

- The `moderate_report` function is a single SQL transaction. It cannot be partially applied.
- The CSAM path is special: it always bans + hides + triggers `report-csam` Edge Function (which queues an export to a secure bucket and notifies ECPAT). Document the exact integration with ECPAT before launch — for now, the function logs to a known location and the founder forwards manually.
- Emails to suspended/banned users via Resend with bilingual templates.

**Self-review (security + data lens):**

- [ ] Audit log row written every time, including dismissals.
- [ ] No way to skip the audit log.
- [ ] CRITICAL-PATH marker.
- [ ] CSAM path tested (mock the export).

**Done when:** all tests pass; full moderation cycle (report → action → audit log row → user notified) works.

---

## Task 7.7 — Strikes & lifecycle

**Context:** `.claude/skills/moderation/SKILL.md` §7.

**Goal:** repeated violations escalate from warn → suspend → ban.

**Acceptance criteria:**

- `profiles.strike_count` increments on warn or suspend (already in schema).
- The `moderate_report` function applies the right action based on count: 0→warn, 1→suspend, 2→ban — the moderator can override (e.g. severe action on first offence).
- A "Reset strikes" admin-only action (for false positives) — buried in the report detail UI, audit-logged.

**Tests to write first:**

- Integration test: warn → strike 1.
- Integration test: warn at strike 1 → suspend, strike 2.
- Integration test: warn at strike 2 → ban, strike 3.
- Integration test: explicit "ban" overrides the strike progression.

**Implementation notes:**

- Strike count never decreases automatically. Time-based reset is a future feature.

**Self-review:**

- [ ] Audit log captures the strike change reason.

**Done when:** all tests pass.

---

## Task 7.8 — Audit log viewer

**Context:** Phase 2 task 2.12.

**Goal:** moderators can browse the audit log for accountability.

**Acceptance criteria:**

- `app/(moderator)/audit.tsx`.
- Paginated list, newest first.
- Filter by actor (specific moderator), target user, action type.
- Tapping an entry shows the full metadata JSON.

**Tests to write first:**

- Component test: paginated list.
- Component test: filters work.

**Implementation notes:**

- Read-only. There is no edit or delete. (RLS enforces this.)

**Done when:** all tests pass.

---

## Task 7.9 — Maestro E2E: report flow

**Context:** Phase 4, 5, 6 patterns.

**Goal:** a report goes end-to-end.

**Acceptance criteria:**

- `e2e/report-flow.yaml`: log in as user → long-press a post → report → reason → submit → success toast.
- A separate `e2e/moderator-action.yaml`: log in as moderator → see report in queue → action it → see audit row.

**Done when:** both flows green on iOS + Android.

---

## Task 7.10 — Manual review pass

**Context:** end of phase.

**Goal:** the founder spends a half-day exercising every trust & safety path on real devices.

**Acceptance criteria:**

- Checklist: report a post; report a comment; report a user; block a user; verify content disappears; submit a contact-info-laden post (filter trips); submit a slur-laden post (filter trips); moderator dashboard shows reports; act on each kind of report; verify audit log; trigger a CSAM action with a placeholder.
- Any issues filed as bug tasks before phase sign-off.

**Done when:** checklist complete, no Sev-1 bugs.

---

## End of Phase 7

Sign-off ritual:

1. Deliverables checklist.
2. ADR entry: CSAM integration approach.
3. **Engage with ECPAT Sweden / NCMEC** to formalise the reporting relationship before public launch.
4. New TestFlight + Play Internal build.
5. Tag `phase-7-complete`.
6. Move to `phase-8-polish-launch.md`.
