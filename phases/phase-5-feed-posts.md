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
- The category chip uses brand colours — soft background, no harsh contrast.

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
5. Move to `phase-6-comments-limits.md`.
