# CSAM Compliance — Pre-Launch Checklist

> **This document is a hard gate before public launch.**
> Nothing on this checklist is optional. Complete every item and record
> the completion date and any reference numbers in the table at the end.

Akin is a UGC platform where users can post anonymous text. As an Electronic
Service Provider (ESP) operating in Sweden and targeting Swedish users, Akin has
specific legal obligations regarding CSAM under EU and Swedish law, and voluntary
obligations toward global child-safety bodies.

---

## 1. Legal framework

| Instrument                               | Relevant requirement                                                                                                                                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EU Directive 2011/93/EU**              | Member-state ESPs must report CSAM to competent authorities. Sweden has transposed this into national law (Brottsbalken 16:10a).                                                                                       |
| **Lag (2002:562) om elektronisk handel** | Swedish implementor of the E-Commerce Directive — sets out the liability safe harbour for hosting. Active knowledge of CSAM removes the safe harbour.                                                                  |
| **GDPR (EU 2016/679)**                   | CSAM evidence files contain personal data. The 90-day retention requirement (for law enforcement) must be balanced against data minimisation. The legal basis is compliance with a legal obligation (Art. 6(1)(c)).    |
| **NCMEC CyberTipline (US)**              | US federal law (18 U.S.C. § 2258A) requires US ESPs to report. Akin is not a US company, but NCMEC accepts voluntary reports from non-US ESPs and assists with law enforcement referrals. Submitting is best practice. |

---

## 2. Technical readiness checklist

### 2.1 Immediate response path (already shipped — Phase 7)

- [ ] `moderate_report('csam')` hides content and bans account in a single transaction.
- [ ] Audit log row written with `metadata->>'csam' = 'true'` and `target_content_id`.
- [ ] `report-csam` Edge Function invoked automatically after CSAM action.
- [ ] Evidence export JSON written to private `csam-reports` Storage bucket.
- [ ] Founder receives urgent email within minutes of the action.
- [ ] Evidence retained for minimum 90 days (Storage lifecycle policy — see §2.3).

### 2.2 Storage bucket setup (before first production deployment)

- [x] Create `csam-reports` bucket in Supabase Dashboard. ✓ Created 2026-06-22.
  - Access: **Private** (no public URL access, ever).
  - RLS: no client access — only service-role writes from Edge Function.
  - Lifecycle: **no auto-delete** (deletion requires a manual legal-hold review).
- [ ] Verify bucket exists: `supabase storage ls --project-ref <ref>`.
- [ ] Confirm only service-role can write (test with anon key → expect 403).

### 2.3 Retention policy

- [ ] Document in a legal hold register that `csam-reports` bucket contents are
      retained for a minimum of 90 days from the report date per EU Directive 2011/93/EU.
- [ ] Do not configure any Supabase Storage lifecycle rules that auto-delete
      objects in this bucket.
- [ ] After 90 days and after any law enforcement hold is confirmed lifted:
      content may be deleted. Delete only via a manual founder decision, not automation.

### 2.4 FOUNDER_EMAIL secret (before first production deployment)

- [x] Set `FOUNDER_EMAIL` secret in Supabase Edge Function config. ✓ 2026-06-22.
  ```
  supabase secrets set FOUNDER_EMAIL=<founder-email>
  ```
- [ ] Verify `report-csam` sends a test email on a dry run (use a seed report
      with a test CSAM label — do not use real content).

### 2.5 RESEND_API_KEY (shared with notify-moderation)

- [ ] `RESEND_API_KEY` is already set (required by `notify-moderation`).
- [ ] Verify `safety@ourakin.com` sending domain is verified in Resend dashboard.
- [ ] Verify `noreply@ourakin.com` sending domain is verified for user-facing emails.

---

## 3. ECPAT Sweden engagement checklist

> **SLA: complete before public launch, not before App Review.**

ECPAT Sweden is the Swedish affiliate of ECPAT International, the lead body for
child-safety reporting in Sweden. They provide guidance for ESPs and operate the
Swedish hotline (`anmäl.nu`) for CSAM reports.

- [ ] **Initial contact**: Email `info@ecpat.se` to introduce Akin as a new ESP
      seeking guidance on CSAM reporting obligations under Swedish law.
      Reference: EU Directive 2011/93/EU and Lag (2002:562).
      Record the date and contact person.
- [ ] **Guidance received**: Confirm whether ECPAT Sweden wants proactive reporting
      (i.e. each case sent via their hotline) or whether national police (Polisen) is
      the primary channel.
- [ ] **Hotline integration**: If ECPAT Sweden recommends their hotline, obtain
      the API or submission format and update `report-csam/index.ts` to submit
      automatically. Add an ADR documenting the chosen integration.
- [ ] **SLA definition**: Agree on a target response time for confirmed CSAM cases
      (founder self-imposed SLA: 1 hour to initial action, 24 hours to full report).
      Document in this file under §6.

---

## 4. NCMEC CyberTipline checklist

> **Voluntary but strongly recommended. Complete before public launch.**

NCMEC's CyberTipline accepts reports from non-US ESPs. Filing a report provides
a CyberTipline ID that can be referenced in any Swedish law enforcement engagement.

- [ ] Register Akin as a reporting company at:
      `https://www.missingkids.org/gethelpnow/cybertipline`
- [ ] Obtain an ESP-specific CyberTipline API key (for programmatic submission).
- [ ] Integrate the API into `report-csam/index.ts`:
  - The export JSON is already structured to match CyberTipline format.
  - Add `ncmecSubmittedAt` and `ncmecCyberTiplineId` to the export payload.
- [ ] Test submission with NCMEC's sandbox environment before live use.
- [ ] Record the NCMEC account ID and primary contact in §6.

---

## 5. Internal SLA

| Trigger                                  | Action                                               | Owner           | Time limit |
| ---------------------------------------- | ---------------------------------------------------- | --------------- | ---------- |
| CSAM action taken in mod dashboard       | `report-csam` Edge Function fires automatically      | System          | Immediate  |
| Founder receives urgent email            | Review evidence export, begin ECPAT/NCMEC submission | Founder         | 1 hour     |
| ECPAT/NCMEC submission confirmed         | Record submission references in audit log            | Founder         | 24 hours   |
| Law enforcement engagement (if required) | Contact Polisen Sverige                              | Founder + legal | 48 hours   |

---

## 6. Completion record

> Fill this in as items are completed. This is a legal record — be precise.

| Item                                        | Completed date | Reference / notes                                        |
| ------------------------------------------- | -------------- | -------------------------------------------------------- |
| `csam-reports` Storage bucket created       | 2026-06-22     | Created via Supabase Dashboard. Private, no auto-delete. |
| `FOUNDER_EMAIL` secret set                  | 2026-06-22     | Set via `supabase secrets set`.                          |
| `safety@ourakin.com` Resend domain verified |                |                                                          |
| ECPAT Sweden initial contact                |                |                                                          |
| ECPAT Sweden guidance received              |                |                                                          |
| NCMEC registration                          |                |                                                          |
| NCMEC API integrated + tested               |                |                                                          |
| ECPAT/NCMEC integration reviewed by legal   |                |                                                          |
| Internal SLA agreed and documented          |                |                                                          |

---

## 7. Post-incident record template

Paste a copy of this block into a private ops document for each confirmed CSAM case.

```
Case reference:         CSAM-<timestamp>-<reportId>
Date of incident:
Reported by (mod ID):
Content type:           post | comment
Content ID:
Storage export path:    csam-reports/CSAM-*.json
Audit log ID:
Action taken:           ban + hide
ECPAT submission date:
ECPAT reference number:
NCMEC submission date:
NCMEC CyberTipline ID:
Law enforcement notified: yes | no | n/a
Law enforcement ref:
Notes:
```
