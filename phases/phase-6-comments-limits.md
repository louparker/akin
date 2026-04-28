# Phase 6 — Comments & participation limits

> **Goal:** users can comment, the limit-state UX is clear and honest, comments arrive in real time. This phase brings the central product mechanic to life.
>
> **Estimated duration:** 5–7 days.
>
> **Prerequisites:** Phase 5 signed off.
>
> **Skills referenced:** `database` (§4 limits), `ui`, `i18n`, `testing` (§5 mocking realtime), `security`.

---

## Phase deliverables — sign-off checklist

- [ ] Comment input, validation, submit.
- [ ] All limit states surfaced clearly: post is full, user is at active cap, user is already a participant.
- [ ] Realtime comment updates on the post detail screen.
- [ ] Optimistic comment append with rollback on failure.
- [ ] Maestro E2E: 4 accounts comment on a post, the 5th is blocked.

---

## Task 6.1 — Comment input component

**Context:** `.claude/skills/ui/SKILL.md` §8 (forms); the four limit states.

**Goal:** the comment composer at the bottom of the post detail screen, with all the right disabled-state messages.

**Acceptance criteria:**

- `src/features/post/components/CommentInput.tsx`.
- Single multiline text input (max 1000 chars), submit button.
- Disabled with explanatory message when:
  - Post is full and viewer is NOT already a participant: "This conversation has reached its participant limit."
  - User is at active-limit cap (3 posts) and not a participant of THIS post: "You're active in 3 conversations. Conclude one to join another."
  - User is suspended or banned: "You can't comment right now."
  - Posting kill-switch is off: "Posting is paused. Try again shortly."
- Enabled (clean input) when:
  - User is OP (always allowed to comment on own post).
  - User is already a participant of this post (no limit checks needed).
  - User is below active cap AND post has open slot.
- Live character count.

**Tests to write first:**

- Component test: each disabled state renders with the correct bilingual message.
- Component test: enabled state allows typing.
- Component test: submit disabled until ≥ 1 character.
- Component test: submitting triggers the mutation.
- Component test: posting kill-switch off → input disabled.
- a11y check.

**Implementation notes:**

- The state machine for "can this user comment here" is non-trivial. Encapsulate in a hook `useCanComment(post)` that returns `{ canComment, reason, message }`. Test the hook in isolation.
- Don't surface the raw error code from the server. Map to bilingual messages.

**Self-review (UX lens):**

- [ ] Each disabled state has a clear, calm message — never punitive.
- [ ] Both languages.
- [ ] No flicker between states (use TanStack Query's cached data, not a fresh fetch on every render).

**Done when:** all tests pass; manual smoke shows the right state in each scenario.

---

## Task 6.2 — Submit comment mutation

**Context:** `.claude/skills/database/SKILL.md` §4 (the trigger error codes); `ARCHITECTURE.md` §4 (the invariants).

**Goal:** the mutation that inserts a comment, handles the trigger errors, and retries serialization failures.

**Acceptance criteria:**

- `src/features/post/api/useCreateComment.ts` — TanStack Query mutation.
- Inserts via `supabase.from('comments').insert({ post_id, body })`.
- Handles error codes: `INSUFFICIENT_PARTICIPANT_SLOTS` (P0001), `USER_ACTIVE_LIMIT_REACHED` (P0003), `CONTENT_FILTER_HIT` (P0010), `CONTACT_INFO_NOT_ALLOWED` (P0011), `40001` (serialization_failure — retry).
- Retries serialization failures up to 3 times with backoff (50ms, 150ms, 450ms).
- Optimistic update: appends a placeholder comment with `pending: true` flag; replaces with server data on success; removes on failure.
- Invalidates post detail and post list queries on success.

**Tests to write first:**

- Mutation test: success path appends the optimistic comment.
- Mutation test: rollback on error removes the optimistic comment.
- Mutation test: P0001 maps to the right user-facing message.
- Mutation test: P0003 maps to the right user-facing message.
- Mutation test: P0010 / P0011 map correctly.
- Mutation test: serialization failure retries 3 times.
- Mutation test: 4th serialization failure surfaces a network error.

**Implementation notes:**

- The `pending: true` flag lets the UI render the comment in a slightly muted state until confirmed. A subtle visual distinction.
- Don't retry P0001 / P0003 — those are user-facing rejections, not transient.

**Self-review (data lens):**

- [ ] Cache invalidation is precise — only the relevant post's queries.
- [ ] No way for an optimistic update to persist after a hard failure.

**Done when:** all tests pass; manual flow shows immediate appearance of the comment with a fade-in once confirmed.

---

## Task 6.3 — Realtime comment updates

**Context:** `ARCHITECTURE.md` §6 (realtime per-post only); `.claude/skills/testing/SKILL.md` §5 (mocking).

**Goal:** when another user comments on the post you're viewing, you see it appear without refresh.

**Acceptance criteria:**

- `src/features/post/api/usePostComments.ts` subscribes to a `post:{postId}` Realtime channel on mount, unsubscribes on unmount.
- New comments are inserted into the TanStack Query cache for the post detail.
- Soft fade-in animation for newly arrived comments (Reanimated 4, reduced-motion aware).
- Subscription disabled when `realtime_open` flag is false (kill-switch).
- Subscription disabled when the screen is not focused (battery-friendly).
- Reconnect handling: if the connection drops, refetch comments on reconnect to catch up.

**Tests to write first:**

- Hook test: subscribes on mount.
- Hook test: unsubscribes on unmount.
- Hook test: receiving a new comment updates the cache.
- Hook test: realtime_open=false skips subscription.
- Hook test: refocus refetches.

**Implementation notes:**

- Mock Supabase Realtime at the SDK level for tests — see `.claude/skills/testing/SKILL.md` §5.
- The channel name is `post:${postId}`. Filter on `INSERT` events on `comments` where `post_id = postId`.
- Don't trust the realtime payload for security — RLS should already filter, but the client also filters on `status = 'active'` defensively.

**Self-review (performance lens):**

- [ ] One channel per post, not one channel for the whole feed.
- [ ] Subscription closes when leaving the screen.

**Done when:** open a post on two devices, comment from one, see it on the other within 1s.

---

## Task 6.4 — CommentItem component

**Context:** `.claude/skills/ui/SKILL.md` §3.

**Goal:** the visual representation of a single comment in the thread.

**Acceptance criteria:**

- `src/components/composed/CommentItem.tsx`.
- Displays: author identifier, body, relative time, OP badge if author == post.author_id.
- Long-press → action sheet (block, report, also delete-mine if it's the user's own and within 15-min window).
- Pending state (when `pending: true`): muted opacity, "sending…" indicator.
- Memoised.
- Soft fade-in animation when newly arrived via Realtime.

**Tests to write first:**

- Component test: renders all fields.
- Component test: OP badge shows for the post author's comments.
- Component test: pending state visual.
- Component test: long press shows action sheet (handlers stubbed).
- Component test: edit-mine option only appears within 15 min and only on own comments.

**Implementation notes:**

- Edit / delete mine come in this phase because they belong to the comment lifecycle. The 15-min window is enforced by the Phase 2 RLS policy; the client just hides the option after the window expires.

**Self-review:**

- [ ] Both themes; both languages.
- [ ] Tap targets on action sheet ≥ 44pt.

**Done when:** all tests pass.

---

## Task 6.5 — Edit & delete own comment (within 15 min)

**Context:** Task 2.6 (the edit-window RLS).

**Goal:** users can edit or soft-delete their own comments within 15 minutes.

**Acceptance criteria:**

- "Edit" entry on the action sheet (only own + within window) opens an inline edit textarea.
- "Delete" entry on the action sheet (same conditions) confirms then soft-deletes.
- Soft-delete renders the comment as `[deleted]` placeholder; the slot is preserved.
- Editing past 15 minutes shows a friendly "Editing window has closed" message.

**Tests to write first:**

- Component test: edit textarea pre-populates with current body.
- Component test: submitting an edit updates the cache.
- Component test: editing past 15 min surfaces the right error.
- Component test: deleting renders `[deleted]`.

**Implementation notes:**

- Soft-deleted comments still occupy a participant slot for the author. (Deleting a comment does not free up a slot — that would be exploitable.)

**Self-review:**

- [ ] Edits do not change `created_at`.
- [ ] Soft delete preserves audit trail.

**Done when:** all tests pass.

---

## Task 6.6 — "Full" celebration moment (light)

**Context:** `.claude/skills/ui/SKILL.md` §1, §6.

**Goal:** when a conversation fills up (4 participants), there's a small acknowledgment. Not gamified — just clear.

**Acceptance criteria:**

- When the post detail screen detects `is_full = true` (newly), display a calm "This conversation is now full" notice at the top of the comment list.
- The notice is bilingual.
- No animation more than a 200ms fade-in.
- The notice is dismissible (per-session, not persistent).

**Tests to write first:**

- Component test: notice appears when post transitions to full.
- Component test: notice does not appear if the post was already full when the user opened it (it's the transition that's notable, not the state).
- Component test: dismissing hides it for the session.

**Implementation notes:**

- This is a small product detail that signals "you participated in something complete." Do not overdo it.

**Self-review:**

- [ ] No celebratory iconography (no confetti, no checkmark, no sparkle).
- [ ] Both languages.

**Done when:** manual scenario (with 4 test accounts) shows the moment trigger when the 4th participant arrives.

---

## Task 6.7 — Active-conversations counter on the create FAB

**Context:** Task 5.7 from Phase 5.

**Goal:** the FAB (or create tab) shows a small indicator of how close you are to the active cap.

**Acceptance criteria:**

- The create button shows a subtle dot or small text "2/3" when the user is at 2 active posts; "3/3" when at cap.
- At cap, tapping the FAB shows a popover explaining the limit.
- The counter pulls from the user's profile; updates via TanStack Query invalidation when comments are made.

**Tests to write first:**

- Component test: indicator appears at 2/3 active posts.
- Component test: at 3/3, FAB tap shows popover instead of navigating.

**Implementation notes:**

- The `active_post_count` lives on `profiles`. Reads are cheap.
- This is the only "engagement-style" UI element in v1, and it exists only to prevent confusion, not to gamify.

**Self-review:**

- [ ] Indicator is calm — no red badge.

**Done when:** verified manually with a test account.

---

## Task 6.8 — Maestro E2E: comment-to-full flow

**Context:** the most important E2E flow in v1.

**Goal:** four test accounts comment on a post and the 5th is correctly rejected.

**Acceptance criteria:**

- `e2e/comment-to-full.yaml` flow.
- Setup: pre-seed a post by user A.
- B, C, D each comment on it.
- E attempts to comment and sees the "full" message.
- A comments again (allowed — they're the OP).

**Tests to write first:** the flow.

**Implementation notes:**

- This flow runs only on release branches in CI — too slow per-PR.
- May require multiple test accounts in the seed data.

**Done when:** flow green on iOS + Android.

---

## End of Phase 6

Sign-off ritual:

1. Deliverables checklist.
2. ADR entry: realtime scope decision, "full" notice approach.
3. New TestFlight + Play Internal build.
4. **Schedule second paid expert review** — this is the one for the limits trigger code, now that it's been exercised in real flows.
5. Tag `phase-6-complete`.
6. Move to `phase-7-trust-safety.md`.
