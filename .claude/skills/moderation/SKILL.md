---
name: moderation
description: Read this skill before touching reporting, blocking, content filtering, the moderator dashboard, audit logging, or any code that handles user-flagged content. Covers the report taxonomy, the moderation queue, ban-evasion mitigations, and the kill-switches.
---

# Moderation skill

> Activate this skill whenever your task touches reports, blocks, the audit log, or anything that affects what a user sees in the feed.

---

## 1. Why moderation is a v1 feature, not a v2 feature

Akin is anonymous and dating-adjacent. The realistic launch-day scenarios include harassment, scams, hate speech, and false reports as a weapon. Without working moderation tools, we ship a liability — including an App Store rejection risk under guideline 1.2.

V1 ships with: in-app reporting, in-app blocking, server-side keyword filtering, and a founder-operated review queue. That's the minimum.

---

## 2. The report taxonomy

Reports use a fixed enum:

```
'harassment' | 'hate' | 'spam' | 'sexual' | 'threat' | 'off_topic' | 'other'
```

Reasons map to:

- `harassment` — targeted attacks, doxxing, intimidation.
- `hate` — slurs, hate speech, dehumanising language about protected groups.
- `spam` — promotional content, scams, repeat off-topic posts.
- `sexual` — explicit sexual content (note: discussion of dating/sex is allowed; explicit content is not).
- `threat` — credible threats of violence or self-harm by another.
- `off_topic` — unrelated to the post or category.
- `other` — with mandatory `notes` field.

The taxonomy lives in `src/i18n/{sv,en}.ts` under `report.reasons.*` so the labels can be tuned without changing the enum.

---

## 3. Reporting flow

```
User long-presses post or comment
  → ActionSheet: [Report, Block author, Cancel]
  → Tap Report → ReasonPicker modal
  → Pick reason → optional notes (required for "other") → Submit
  → Server inserts a row in `reports`
  → Client shows a brief acknowledgment toast
  → Reporter sees nothing more — no status updates, no public marker
```

**Why no status updates:** privacy and de-escalation. The reporter shouldn't be able to tell when or how a report was actioned, and the reportee should not know who reported them.

**Rate limit reports:** max 5 reports per hour per reporter (Postgres trigger). Stops report-bombing.

**Repeat-reporter signal:** if user A reports user B more than 3 times across different posts in 7 days, the moderator queue flags this for cross-checking. The flag isn't visible to A.

---

## 4. Blocking flow

```
User long-presses post or comment
  → ActionSheet → Block author
  → Confirm modal: "You won't see [identifier]'s posts or comments. They won't be told."
  → Confirm → server inserts a row in `blocks`
  → Client invalidates feed and post detail queries
  → Blocked user's content disappears from the blocker's view
```

**Bidirectional invisibility:** if A blocks B, B's content disappears from A's view AND A's content disappears from B's view. This is enforced in the RLS `USING` clause on posts and comments — see `database/SKILL.md` §2.

**Blocking does not** prevent the blocked user from posting. It only affects what the blocker sees. (The blocked user is unaware they were blocked; their attempts to comment on a thread the blocker started will simply not see the thread.)

**Edge case:** if the blocked user is already a participant in a thread the blocker started before the block, their comments still won't show. The trigger doesn't unwind history; the RLS policy hides the rows on read.

---

## 5. Keyword filtering at write time

Server-side, on `posts` insert and `comments` insert, run the body through a keyword filter. The filter lives in a Postgres function:

```sql
CREATE OR REPLACE FUNCTION check_content_filter(content text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Slur lists
  IF EXISTS (SELECT 1 FROM filter_words WHERE kind = 'slur' AND content ILIKE '%' || word || '%') THEN
    RAISE EXCEPTION 'CONTENT_FILTER_HIT' USING ERRCODE = 'P0010';
  END IF;
  -- Contact info patterns (phone, email, social handles)
  IF content ~ '(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}' THEN
    RAISE EXCEPTION 'CONTACT_INFO_NOT_ALLOWED' USING ERRCODE = 'P0011';
  END IF;
  IF content ~ '[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}' THEN
    RAISE EXCEPTION 'CONTACT_INFO_NOT_ALLOWED' USING ERRCODE = 'P0011';
  END IF;
  IF content ~* '(snapchat|instagram|telegram|whatsapp|kik|signal|onlyfans)\W' THEN
    RAISE EXCEPTION 'CONTACT_INFO_NOT_ALLOWED' USING ERRCODE = 'P0011';
  END IF;
END;
$$;
```

The slur list is bilingual (Swedish + English) in `filter_words`. Curate it by hand. Don't use a third-party blocklist that includes false positives (e.g. blocking the word "scrap" because it contains "rap").

The filter is intentionally conservative — it errs toward false positives. A user who hits it sees an i18n message: "Your message couldn't be posted. If you think this is a mistake, contact support." Hidden complaints are reviewed weekly.

LLM-based pre-screening is post-MVP — out of scope for v1.

---

## 6. The moderator dashboard

The moderator dashboard is a separate Expo Router route group `(moderator)/` accessible only to users with the `moderator` role.

```
(moderator)/
├── queue.tsx           # List of open reports, sorted by age
├── report/[id].tsx     # Report detail with content + actions
├── audit.tsx           # Recent moderation actions
└── _layout.tsx         # Guards the route group via is_moderator()
```

Actions available on a report:

- Dismiss (no action) — sets `reports.status = 'dismissed'`, logs to audit.
- Hide content — sets target's `status = 'hidden'`, logs to audit.
- Warn user — increments `profiles.strike_count`, sends an in-app + email notice via Edge Function, logs.
- Suspend (7 days) — sets `profiles.status = 'suspended'`, `suspended_until = now() + 7 days`, logs.
- Ban (permanent) — sets `profiles.status = 'banned'`, logs.
- Severe (CSAM, credible threat) — immediate ban + report to ECPAT/NCMEC. Edge Function handles the upstream report.

Every action writes to `audit_log` with the moderator's `auth.uid()`, the action, the target, and the reason.

**SLA:** founder responds to reports within 24 hours. CSAM and credible threats within 1 hour.

---

## 7. Strikes-based account lifecycle

```
0 strikes:  active, full access
1 strike:   warning issued, account active
2 strikes:  7-day suspension. Login allowed, posting/commenting blocked.
3 strikes:  permanent ban. Login still works (so the user can export their data per GDPR), but no posting/commenting.
```

A strike resets the suspended_until timer. Severe violations skip strikes and go straight to ban.

When a user is banned, their existing posts and comments are hidden (status = 'hidden'), but kept for audit purposes for 90 days, then deleted.

---

## 8. Ban evasion

A banned user creates a new email and signs up again. Mitigations, layered:

- **Same IP-range signal:** Postgres function `signups_from_ip_in_24h(ip)` flags clusters. Not a hard block (shared IPs exist) — flags for moderator review.
- **Device fingerprint signal:** Expo's `application` API gives a stable install ID per device. Not bulletproof (reinstall resets it), but useful as a soft signal.
- **Phone verification (post-v1):** if evasion becomes a real problem, add SMS verification. This is in the v1.2 backlog, not v1.
- **Hidden in moderator UI:** when reviewing a new account, the moderator dashboard surfaces "this device/IP was used by [banned identifier] X days ago."

Don't implement aggressive blocking based on IP alone — it punishes anyone behind a shared mobile carrier or VPN.

---

## 9. The audit log

Every moderation action writes to `audit_log`. The log is append-only. Even moderators can't delete entries. (RLS: `INSERT` allowed for the dashboard via SECURITY DEFINER function; `DELETE` is forbidden by the absence of a policy.)

Schema:

```sql
audit_log (
  id            bigserial PRIMARY KEY,
  actor_id      uuid,                    -- moderator or NULL for system
  action        text,                    -- 'report.actioned', 'user.suspended', etc.
  target_type   text,                    -- 'post', 'comment', 'user'
  target_id     uuid,
  metadata      jsonb,                   -- reason, original report ID, prior status
  created_at    timestamptz DEFAULT now()
)
```

The audit log is the founder's defence in a regulatory complaint or a user dispute. Treat it like financial records — never lose, never edit.

---

## 10. The kill-switches

Three flags in `feature_flags`. Set via SQL or via a moderator-only edit screen.

| Flag            | Effect when false                                                |
| --------------- | ---------------------------------------------------------------- |
| `signups_open`  | New signups blocked with a friendly "we're full right now" page. |
| `posting_open`  | Post and comment creation disabled with a friendly message.      |
| `realtime_open` | Realtime subscriptions disabled (clients fall back to polling).  |

Use cases:

- During App Store review: lock signups to internal accounts only.
- During a moderation overload: pause signups while the queue clears.
- During an incident: pause posting until root cause is found.
- During a Realtime cost spike: drop Realtime, accept worse UX, save the bill.

Every flag has a default in code so a missing row doesn't break the app:

```ts
const DEFAULT_FLAGS = {
  signups_open: true,
  posting_open: true,
  realtime_open: true,
};
```

Flags are checked on app start and re-checked on a 60-second poll. They're not realtime — that's deliberate, to keep the kill-switch path simple and auditable.

---

## 11. CSAM — zero tolerance, immediate action

If a report is filed under any reason and the moderator confirms CSAM:

1. Hide the content immediately (`status = 'hidden'`).
2. Permanently ban the account (`profiles.status = 'banned'`).
3. Preserve the evidence: the Edge Function `report-csam` exports the content + metadata to a secure, time-limited audit bucket and notifies ECPAT Sweden / NCMEC.
4. Document in the audit log.
5. Do not delete the source content from the database for at least 90 days (legal preservation requirement).

There is no warning, no strike, no appeal in this path. This is the only zero-tolerance category.

---

## 12. Moderation review checklist

Before merging anything that touches moderation:

- [ ] Reports use the fixed enum, not free text for the reason.
- [ ] Blocked users disappear from the blocker's view in feed AND post detail (write the test).
- [ ] Audit log row written for every moderator action.
- [ ] Rate limits in place for new signal endpoints.
- [ ] Kill-switch flag read on app start; default sane value if flag missing.
- [ ] No moderation action exposes the reporter's identifier to anyone except moderators.
- [ ] No moderation UI accessible to non-moderator users (verified by RLS test, not just route guard).
- [ ] Bilingual reason labels for the user-facing report flow.
