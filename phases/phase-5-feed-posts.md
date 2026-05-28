# Phase 5 — Feed & posts

> **Goal:** the main consumption surfaces. Users can browse the feed, filter by category, sort, open a post, read it, and create their own. No comments yet — those come in Phase 6.
>
> **Estimated duration:** 6–9 days.
>
> **Prerequisites:** Phase 4 signed off.
>
> **Skills referenced:** `ui` (especially §5 lists), `i18n`, `database` (for the feed queries), `testing`.

---

## Phase deliverables — sign-off checklist

- [ ] Feed screen with infinite scroll, sort, filter.
- [ ] 9 category screens.
- [ ] Post detail screen (read-only — commenting is Phase 6).
- [ ] Create post screen with category picker, validation, post-publish navigation.
- [ ] Post card component used everywhere (feed, category, profile-mine).
- [ ] Pull-to-refresh on every list.
- [ ] Loading, empty, error states for every screen.
- [ ] Maestro E2E: create post → see it in feed.

---

## Task 5.1 — Feed query and pagination

**Context:** `ARCHITECTURE.md` §2 (indexes), `.claude/skills/database/SKILL.md` §7.

**Goal:** a paginated feed query that respects the indexes, the block list, and the active-status filter. Three sort orders.

**Acceptance criteria:**

- `src/features/feed/api/useFeed.ts` — TanStack Query infinite query.
- Sort options: `recent` (created_at DESC), `comments` (comment_count DESC), `spice` (average_spice_level DESC NULLS LAST).
- Optional category filter.
- Page size: 20.
- Cursor-based pagination using the sort column + `id` as a tiebreaker (e.g. for `recent`: `WHERE (created_at, id) < (last_created_at, last_id)`).
- Block-aware (RLS already does this — verify with a test).

**Tests to write first:**

- Hook test: returns the first page of 20 posts.
- Hook test: fetching the next page uses the cursor correctly.
- Hook test: switching sort invalidates and refetches.
- Hook test: applying a category filter uses the right query.
- Integration test (against local Supabase): block A → A's posts disappear from B's feed.

**Implementation notes:**

- Cursor pagination > offset pagination. With offset, late inserts shift everything. With cursor, results are stable.
- Use `select(...)` with explicit columns to avoid pulling unused fields (faster + safer).
- Don't subscribe to Realtime on the feed — pull-to-refresh is the model.

**Self-review (performance lens):**

- [ ] Query plan shows index use for each sort.
- [ ] Page size 20 is reasonable (not too many for first paint, not too few for scroll).
- [ ] No N+1 — single query returns everything needed.

**Done when:** all tests pass; manual smoke scrolls through 100+ posts smoothly.

---

## Task 5.2 — PostCard component

**Context:** `.claude/skills/ui/SKILL.md` end-to-end.

**Goal:** the card used in the feed, category pages, and profile.

**Acceptance criteria:**

- `src/components/composed/PostCard.tsx`.
- Displays: title, body excerpt (3 lines max with ellipsis), category chip, author identifier, relative time, comment count, average spice level (flames icons).
- Pressable — navigates to `(main)/post/[id]`.
- "Full" badge when `is_full = true`.
- Memoised with `React.memo` and a custom equality check on the `post` prop.
- Long-press shows the action sheet (block, report) — wired in Phase 7; for now stub the handler.

**Tests to write first:**

- Component test: renders all required fields.
- Component test: tap navigates to the right route.
- Component test: full posts show the "Full" badge.
- Component test: spice level renders the right number of flames.
- Component test: long body is truncated to 3 lines.
- a11y check.

**Implementation notes:**

- Use the `Pressable` primitive from Phase 3 — handles haptics and reduced-motion automatically.
- The category chip (`CategoryTag`) is Inter 11.5pt, weight 500, uppercase, 0.3 letter-spacing, `brand.primary` (teal). NO background pill — just the text.
- **Design spec (from handoff):** Card padding 20/22pt, hairline bottom border. Row 1: CategoryTag · dot · timestamp (Inter 12pt `fg.tertiary`). Title: Source Serif 4 19pt `fg.primary` lineHeight 1.3 letterSpacing -0.2. Excerpt: Inter 14pt `fg.secondary` lineHeight 1.5, 2-line clamp. Footer: Ident chip left; Capacity dots + "n/4" + Spice flames right (11pt flames). Excerpt clamp is 2 lines (handoff shows 2, not 3 — use 2 in PostCard).
- The "Full" state is shown as "4/4 · full" in the footer (no badge chip — just text).

**Self-review:**

- [ ] Memoisation correct — verify with React DevTools that re-rendering the parent doesn't re-render every card.
- [ ] No PII rendered.

**Done when:** all tests pass; visual review on a feed of 50 cards.

---

## Task 5.3 — Feed screen

**Context:** Tasks 5.1 and 5.2.

**Goal:** the main feed in the (main) tab navigator.

**Acceptance criteria:**

- `app/(main)/feed.tsx` (or `index.tsx` if feed is the home).
- FlashList v2 with infinite scroll.
- Pull to refresh.
- Sort menu (sheet or popover) with three options.
- Category filter: a horizontal chip list pinned to the top, "All" + the 9 categories.
- Loading skeleton (4 card-shaped skeletons).
- Empty state (rare, but: "Quiet for now. Be the first to share something.")
- Error state with retry.

**Tests to write first:**

- Component test: each of the four states (loading, empty, error, loaded) renders correctly with stubbed data.
- Component test: pull-to-refresh invokes `refetch`.
- Component test: changing sort invokes the right query key.
- Component test: tapping a category chip filters.

**Implementation notes:**

- The category chip list scrolls horizontally; when one is selected, the screen scrolls to top to make it clear that the list changed.
- Don't auto-load the next page on every scroll event — use `onEndReachedThreshold: 0.5`.
- **Design spec (from handoff):** Feed header: serif "akin" wordmark 30pt letterSpacing -0.5. Below: "All" | "Categories" tab row (Inter 13.5pt `fg.tertiary`) + sort icon+label right. Sort sheet has 3 options + minimum spice filter (Any, 1+…5+) with full-width "Apply" button. Categories tab shows a list (not chips) of all 9 categories with names in serif 19pt + mono count + "open" label + chevron. Empty state: centred serif message with italic category name, sans explainer, one secondary button "Start one".

**Self-review (performance lens):**

- [ ] FlashList correctly memoised render functions.
- [ ] No layout jank on category change (test with 100+ items).
- [ ] Skeleton matches the real layout's height.

**Done when:** all tests pass; manual scroll on iOS + Android is smooth.

---

## Task 5.4 — Category screen

**Context:** Tasks 5.1 and 5.3.

**Goal:** a dedicated screen per category. Same as feed but pre-filtered.

**Acceptance criteria:**

- `app/(main)/category/[name].tsx` route.
- Same FlashList + states as feed.
- Header: the category's display name (bilingual via `i18n`), a 1-line description.
- Sort options available, but the category filter is locked.

**Tests to write first:**

- Routing test: `category/vent_space` shows the right header.
- Component test: only posts of that category are returned by the query (mock the API).
- Component test: invalid category name shows a 404-style empty state.

**Implementation notes:**

- The category list page (a directory of all 9 categories with descriptions) doesn't strictly need to exist — the feed's chip filter covers it. Skip unless the founder wants it.

**Self-review:**

- [ ] Bilingual headers and descriptions.

**Done when:** all 9 categories are reachable and render.

---

## Task 5.5 — Post detail screen — read mode

**Context:** Phase 6 will add commenting. For Phase 5, we render the post and the existing comment list.

**Acceptance criteria:**

- `app/(main)/post/[id].tsx` route.
- Fetches the post, comments, and the user's spice vote (if any) via TanStack Query.
- Displays: post title, body (full), category, author identifier, time, view count, spice voting widget, comment list (read-only in this phase).
- Increments `view_count` on first render (via an Edge Function or RPC — debounced so a user opening the same post twice quickly doesn't double-count).
- Block-aware (RLS handles this — verify).
- Loading skeleton, error state, "post not found" state (e.g. if hidden by moderation).

**Tests to write first:**

- Component test: renders the full post.
- Component test: renders a list of comments (stubbed).
- Component test: not-found state renders when query returns 0 rows.
- Component test: view increment fires once, even if the screen unmounts and remounts within 30s.

**Implementation notes:**

- The view count increment uses a Postgres function `increment_view(post_id uuid)` called via `rpc()`. The function debounces internally using a small `view_events` table or just upserts based on `(user_id, post_id, hour_bucket)`.
- Don't fetch comments in a separate query unless needed — for v1 they come with the post (small enough).
- **Design spec (from handoff):** TopBar back + `···` right. Post header section: CategoryTag + dot + timestamp → Serif title 24pt lineHeight 1.25 letterSpacing -0.3 → body Inter 15pt lineHeight 1.6 `fg.secondary` → Ident chip + Capacity dots. Spice section (separate row with hairline borders): "Spice level" mono label + large flames (16pt) + average + vote count right. "N replies" mono label row. Comment rows: Ident chip + optional "OP" teal badge + timestamp right → body Inter 14.5pt. Reply bar at bottom: pill input (rounded, `bg.sunken`, `border.divider`) + circular send button (`bg.inverse`, `fg.inverse` icon). "Full" state: comments replaced by skeleton placeholders, bottom bar replaced by `bg.raised` lock message panel.

**Self-review:**

- [ ] No 404 leaks information about whether the post existed but was hidden vs never existed.
- [ ] View increment doesn't slow down the main render.

**Done when:** all tests pass; opening a post from the feed shows it correctly.

---

## Task 5.6 — Spice voting

**Context:** Phase 2 task 2.8 (the spice_votes table).

**Goal:** users can rate a post 1–5; can change their vote; cannot vote on their own post.

**Acceptance criteria:**

- `src/features/post/components/SpiceVote.tsx`.
- Five flame buttons. Tapping one casts the vote.
- Optimistic UI: the user's vote shows instantly; rollback on server error.
- Disabled on own posts (with a small "?" tooltip explaining).
- Hover/press: flames brighten subtly (Reanimated 4, reduced-motion aware).
- After voting, shows "Your rating: N" below.

**Tests to write first:**

- Component test: tapping a flame calls the mutation with the right score.
- Component test: optimistic update shows immediately.
- Component test: server error rolls back the optimistic update.
- Component test: disabled on own posts.
- Component test: changing a vote updates the value.

**Implementation notes:**

- Use the `useMutation` `onMutate` / `onError` pattern for optimistic updates.
- Invalidate the post query after success to get the new average.
- Haptic feedback: `expo-haptics` `impactAsync(Light)` on each flame tap.

**Self-review (UX lens):**

- [ ] Animation respects reduced motion.
- [ ] Both themes.
- [ ] Tap targets ≥ 44pt per flame.

**Done when:** all tests pass; voting and changing votes feels responsive.

---

## Task 5.7 — Create post screen

**Context:** `.claude/skills/ui/SKILL.md` §8 (forms); `.claude/skills/i18n/SKILL.md`.

**Goal:** a focused, distraction-free post composer.

**Acceptance criteria:**

- `app/(main)/create-post.tsx` route, accessible from a `+` tab in the bottom nav OR a floating action button on feed (founder picks).
- Fields: title (max 150), body (max 2000), category picker (9 options, single-select).
- Live character counts for both fields.
- Submit button disabled until valid.
- A community-guidelines reminder above the submit ("Be kind, no contact info, no harassment. [Read full guidelines]").
- On submit: insert via `supabase.from('posts').insert(...)`. Map server errors:
  - `USER_ACTIVE_LIMIT_REACHED` → "You're active in 3 conversations. Conclude one to start a new post."
  - `CONTENT_FILTER_HIT` → "Your post couldn't be published. Please review the guidelines."
  - `CONTACT_INFO_NOT_ALLOWED` → "Posts can't include phone numbers, emails, or social handles."
- On success: navigate to the post detail screen (replacing the create screen in the stack).

**Tests to write first:**

- Form test: title length validation.
- Form test: body length validation.
- Form test: category required.
- Form test: submit disabled until valid.
- Form test: each server error maps to the correct bilingual message.
- Form test: success navigates to post detail.

**Implementation notes:**

- The "active limit reached" state should ALSO be shown on the create-post entry point itself — disable the FAB if the user is already at 3 active. Show a tooltip on tap explaining why.
- Keep the form simple. No image picker, no rich-text, no draft-saving in v1.
- **Design spec (from handoff):** The Write tab opens the composer directly. TopBar: "Cancel" ghost text left (dismiss modal), "Post" ink text right (submit, disabled until valid). Category selector row: mono "Category" label + serif selected name 18pt + chevron — tapping opens the Category Picker screen. Title field: Source Serif 4 26pt, auto-expanding (no border, no label). Body field: Inter 15.5pt `fg.secondary` lineHeight 1.6, auto-expanding, cursor is a 1.5pt vertical ink bar. Bottom toolbar (`bg.raised`): "Posting as [mono identifier]" copy + char counters "Title N / 150" and "Body N / 2000" in mono 11pt. Guidelines sheet (bottom sheet): "Before you post." serif 24pt + 3 rule rows (bold label + description) + "Continue" primary button + "Read the full guidelines" text link. Show guidelines on first post only.
- Tab structure: "Write" tab in the bottom TabBar opens the composer as a modal/presented sheet — it's NOT a navigation stack push.

**Self-review (security lens):**

- [ ] Server validation (DB constraints) catches anything the client misses.
- [ ] No PII in analytics.

**Done when:** all tests pass; manual create works end-to-end.

---

## Task 5.8 — Sort & filter persistence

**Context:** lightweight UX polish.

**Goal:** the user's sort and category-filter choices persist across sessions.

**Acceptance criteria:**

- Zustand slice `useFeedPreferences` with `sortBy`, `categoryFilter`.
- Persisted to local storage (using a Zustand persist middleware backed by AsyncStorage — NOT secure-store; this is non-sensitive).
- Restored on app launch.

**Tests to write first:**

- Hook test: changing sort updates the slice.
- Hook test: rehydrating restores the previous selection.

**Implementation notes:**

- Use `zustand/middleware` `persist` with AsyncStorage. This is the only place AsyncStorage is allowed (everything sensitive is in expo-secure-store).

**Self-review:**

- [ ] No PII persisted.

**Done when:** picking a category filter, restarting the app, the filter is still applied.

---

## Task 5.9 — Maestro E2E: create-post flow

**Context:** Phase 4 task 4.11 patterns.

**Goal:** the full flow from feed → create → see it in feed.

**Acceptance criteria:**

- `e2e/create-post.yaml` flow: log in (test account) → tap create → fill form → submit → see new post at top of feed.
- Runs locally on both platforms.

**Tests to write first:** the flow.

**Done when:** flow green on iOS + Android.

---

## End of Phase 5

Sign-off ritual:

1. Deliverables checklist.
2. ADR entry: pagination model (cursor not offset), sort persistence storage choice.
3. New TestFlight + Play Internal build for self-testing.
4. Tag `phase-5-complete`.
5. Complete the Phase 5 carryover tasks below.
6. Move to `phase-6-comments-limits.md`.

---

## Phase 5 carryover — risks surfaced by the post-phase audit

These tasks were discovered during the end-of-Phase-5 status audit (2026-05-27). They are **not** Phase 5 deliverables — Phase 5 ships when the checklist above is green — but they are debts that must clear before Phase 6 can be considered safe. Each is TDD-shaped. Work them in order; they have no inter-dependencies but item 5.C.1 is the highest risk and should go first.

### Task 5.C.1 — pgTAP coverage for migrations 0013–0016

**Risk:** four merged migrations have no pgTAP suite. The most dangerous is 0015 (soft-delete + scheduled purge): a bug here either leaks deleted profiles or hard-deletes accounts early. 0016 fixed a silent RLS rejection (every post INSERT was failing) — without a regression test the same class of bug can return.

**Acceptance criteria:**

- `supabase/tests/onboarded_at.test.sql` — column exists; can be set by owner; allowed-columns guard does not block it.
- `supabase/tests/profile_status_deleted.test.sql` — `'deleted'` enum value exists on `profile_status`.
- `supabase/tests/deleted_at_purge.test.sql` — column exists; partial index exists; running the purge SQL deletes profiles where `status='deleted' AND deleted_at < now() - interval '30 days'`; does NOT delete profiles soft-deleted < 30 days ago; does NOT delete active profiles.
- `supabase/tests/handle_new_user_age_verified.test.sql` — inserting into `auth.users` with `raw_user_meta_data->>'age_verified_at'` set produces a profile with `age_verified_at` populated; NULL metadata produces NULL.

**Done when:** `pnpm test:db` green on all 16 migrations.

### Task 5.C.2 — Component / integration tests for Phase 5 sheets

**Risk:** `ReportSheet`, `SpiceVoteSheet`, `LimitActiveSheet`, `GuidelinesSheet`, `CategoryPickerSheet` are shipped in the post detail / create flows but have no component tests. Regression risk on every refactor; bilingual copy can drift.

**Acceptance criteria:**

- Component test per sheet: renders both languages; primary action fires the right mutation/handler; close action dismisses; a11y check passes.
- For `SpiceVoteSheet`: tap each flame calls the mutation with the right score; disabled on own posts.
- For `ReportSheet`: each reason maps to the right enum value sent to `useReport`.

**Done when:** all five sheets have at least one passing component test under `src/features/post/__tests__/`.

### Task 5.C.3 — Verify scheduled-purge edge function end-to-end

**Risk:** [supabase/functions/scheduled-purge/](supabase/functions/scheduled-purge) exists alongside the pg_cron job in 0015 but there's no test confirming either fires. A silent failure means deleted accounts linger past 30 days — a GDPR exposure.

**Acceptance criteria:**

- Local integration test (script in `supabase/tests/` or a `pnpm` task) that: inserts a profile, soft-deletes it with `deleted_at = now() - interval '31 days'`, invokes the purge SQL (or the function locally), asserts the row is gone.
- Document in `DECISIONS.md` whether canonical purge is pg_cron OR the edge function — not both. Remove the redundant one.

**Done when:** test passes; ADR clarifies the single source of truth for purge.

### Task 5.C.4 — Activate `useThemeStore` or remove it

**Risk:** [src/features/theme/store/useThemeStore.ts](src/features/theme/store/useThemeStore.ts) is a placeholder. Phase 8 needs a working dark-mode toggle; shipping with a dead store is misleading and accumulates phantom-feature risk.

**Acceptance criteria:** either (a) wire the store to `useColorScheme` + a persisted user override and use it from `useColorTokens`, with tests; or (b) delete the store and re-introduce in Phase 8.

**Done when:** no dead placeholder code in `src/features/theme/`.

### Task 5.C.5 — Remove orphan `__stub__.ts` scaffolding files

**Risk:** six `__stub__.ts` files (`src/components`, `src/features`, `src/i18n`, `src/lib`, `src/theme`, `src/types`) are scaffolding leftovers. Harmless but they hide the real surface area and confuse the agent on future tasks.

**Acceptance criteria:** delete the six files; confirm `pnpm typecheck` and `pnpm test` still pass.

**Done when:** `git ls-files '**/__stub__.ts'` returns nothing.

### Task 5.C.6 — Expand Maestro coverage

**Risk:** only three Maestro flows. The five critical flows per `.claude/skills/testing/SKILL.md` §9 are signup, create-post, comment, block, delete-account. Three remain. Phase 6 needs the comment flow before sign-off.

**Acceptance criteria:** add `e2e/comment.yaml` (4 commenters + 5th blocked) — but write the _skeleton_ now and complete it as Phase 6 Task 6.x fills in the UI. Add `e2e/delete-account.yaml` and `e2e/block.yaml` to the backlog list in `e2e/README.md`.

**Done when:** `e2e/README.md` table lists all five critical flows with status (✓ green / ⏳ pending phase X).

### Task 5.C.7 — PostHog event coverage

**Risk:** PostHog is wired but only `app_opened` is tracked. Without behavioural events we can't measure activation funnel during the closed beta.

**Acceptance criteria:** define a minimal event list in `DECISIONS.md` (e.g. `signup_started`, `signup_completed`, `onboarding_completed`, `post_created`, `feed_sort_changed`) and instrument them via the existing `track()` helper in [src/lib/analytics.ts](src/lib/analytics.ts). No PII — see scrubbing in `analytics.ts`.

**Done when:** each defined event fires once in the happy path and is verified in PostHog EU dev project.
