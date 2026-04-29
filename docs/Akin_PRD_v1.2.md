**Akin — Product Requirements Document**

_Version 1.2 (MVP) — Tech stack revised for 2026_

Author: Louparker | Status: Draft | Date: April 25, 2026

# 1. Introduction

This document outlines the requirements for the first version (v1.0 MVP) of Akin, a React Native mobile application built with Expo. Akin aims to be an anonymous-feeling, dating-related conversation space where users can share experiences, ask for advice, and connect through categorized discussions.

V1.0 focuses on core user authentication, a dynamic post feed with filtering and sorting, category-specific views, post creation, a basic user profile, and the unique interaction limits (max 3 active comment threads per user, max 4 participants per post including OP).

This revision (v1.2) preserves the original product scope and updates the technology recommendations to reflect the React Native, Expo, and BaaS ecosystem as of April 2026. It also reflects a deliberate choice to build the application using AI coding agents (Claude Code as primary) with the founder acting as architect and reviewer rather than line-by-line implementer. This shapes the testing, review, and operational requirements throughout.

# 2. Goals & Objectives for v1.0

- **Establish core platform: **build a stable, scalable foundation for future features.

- **Validate the core loop: **test user engagement with categorized content and the interaction limits.

- **User authentication: **secure, standard email/password flow.

- **Content creation and consumption: **enable users to create, discover, and interact with posts.

- **Basic interaction: **enable users to view posts and comment within defined limits.

- **Gather early feedback: **collect data and qualitative feedback to inform v1.1+.

# 3. Target Audience (Brief for v1)

- Individuals seeking a space to anonymously discuss dating, relationships, and related experiences.

- Users comfortable with forum-style interactions.

- Primarily mobile-first users.

# 4. User Stories

## 4.1 Authentication & Profile

- **US1.1: **As a new user, I want to sign up using email and password so I can access the app.

- **US1.2: **As a returning user, I want to log in using email and password.

- **US1.3: **As a user, I want to log out of my account.

- **US1.4: **As a user, I want to receive necessary auth emails (verification, password reset).

- **US1.5: **As a user, on signup I want a unique, quirky anonymous identifier (e.g. "CrimsonFox42") shown publicly instead of my real identity.

- **US1.6: **As a user, I want to view my own profile to see my identifier, my posts, and posts I am actively commenting in.

## 4.2 Feed Page

- **US2.1: **As a logged-in user, I want a main feed showing posts from all categories so I can discover content.

- **US2.2: **I want the feed to load more posts as I scroll (infinite scroll).

- **US2.3: **I want to filter the feed by category.

- **US2.4: **I want to sort by Most Recent, Most Comments, and Highest Spice Level.

- **US2.5: **I want to see key info per post: title, category, body excerpt, timestamp, OP identifier, comment count, spice level.

## 4.3 Post Creation

- **US3.1: **I want to access a Create Post page so I can draft and publish a new post.

- **US3.2: **I want to enter a title for my post.

- **US3.3: **I want to write the body content for my post.

- **US3.4: **I want to select one category from the predefined list of 9.

- **US3.5: **I want to submit my post so it becomes visible in the feed and category page.

## 4.4 Post Viewing & Interaction

- **US4.1: **I want to tap a post to view its full details, all comments, and spice level.

- **US4.2: **I want to add a comment to a post.

- **US4.3: **I want to be told if I cannot comment because the post has reached its 3-commenter limit.

- **US4.4: **I want to be told if I cannot comment because I am already active in 3 other posts.

- **US4.5: **I want comments to appear dynamically as they are added.

- **US4.6: **I want to rate a post’s Spice Level (1–5 flames).

## 4.5 Category Pages

- **US5.1: **I want a view dedicated to a specific category (e.g. "Vent Space").

- **US5.2: **I want pagination, in-category filtering (where applicable), and the same sort options as the main feed.

## 4.6 Settings Page

- **US6.1: **I want a Settings page to manage account preferences and access support info.

- **US6.2: **I want a logout option in Settings.

- **US6.3: **I want to view the app’s Privacy Policy and Terms of Service.

- **US6.4: **I want an option to delete my account, with appropriate warnings.

## 4.7 Trust & Safety (new in v1.2)

- **US7.1: **As a user, I must confirm I am 18+ at signup so the app stays compliant with App Store and Play Store policies.

- **US7.2: **As a user, I want to report a post or comment that violates community guidelines.

- **US7.3: **As a user, I want to block another anonymous user so I no longer see their posts or comments.

_Trust **&** Safety was previously deferred to post-v1. Given the dating-adjacent, anonymous nature of the app, basic reporting and blocking are now part of v1 to limit launch-day risk._

# 5. Functional Requirements

## 5.1 User Authentication

- Email/password sign-up and login.

- Secure password hashing (handled by auth provider).

- Session management; user remains logged in across sessions.

- Logout (also accessible from Settings).

- Automated email for verification (on signup) and password reset.

- Generation of a unique anonymous display identifier on signup ([Adjective][Noun][Number]). The identifier is public; the account is tied to email.

- 18+ self-attestation gate at signup, captured against the user record.

## 5.2 Feed Page (/feed)

- **Display: **paginated list of posts.

- **Per post snippet: **title, category, truncated body, timestamp, OP identifier, comment count, average spice level.

- **Pagination: **infinite scroll.

- **Filtering: **by category (multi or single select); by spice level (e.g. 3+ flames).

- **Sorting: **Most Recent (default), Most Comments, Highest Spice Level.

## 5.3 Category Pages (/category/{name})

- Paginated list of posts within a single category.

- Same filtering/sorting affordances as the main feed where applicable.

Categories (fixed enum):

- Vent Space

- All The Feels

- Advice Needed

- Just Wondering

- Story Time

- Decode This!

- AITOO / Reality Check

- Hypothetically Speaking…

- Good Vibes Only

## 5.4 Post Detail Page (/post/{id})

- Full title, body, category, timestamp, OP identifier.

- Comment list (each: commenter identifier, text, timestamp).

- Current average spice level and number of votes.

- Spice level voting (1–5 flames). One vote per user per post.

- Comment input field and submit button. Comments update dynamically (Supabase Realtime).

- Report and block actions on each post and comment.

## 5.5 Interaction Limits Logic

### Per-post participant limit

- Max participants per post = 1 OP + 3 unique commenters = 4 total.

- Once 3 unique commenters (excluding OP) have posted, the comment input is disabled for new commenters with a message such as "This conversation has reached its participant limit."

- OP and the 3 commenters can continue adding more comments to the existing thread.

### Per-user active post limit

- A user can be actively participating in a maximum of 3 posts simultaneously.

- A user is "active" in a post when: (a) they have commented on it, AND (b) the post is not yet full (4 participants).

- Once a post reaches 4 participants (becomes "full"), it no longer counts toward the user’s 3-active limit, freeing them to engage with a new post.

- If a user attempts to comment on a 4th non-full post, they see "You are currently active in 3 conversations. Conclude one to join another."

_These rules are enforced server-side as Postgres constraints/triggers via Supabase, not in client code, to prevent race conditions and tampering._

## 5.6 Create Post Page (/create-post)

- **Access: **floating action button or "+" tab.

- **Title: **text input, max 150 chars.

- **Body: **multiline text area, max 2,000 chars.

- **Category: **single-select from the 9 fixed categories.

- **Validation: **all three fields required.

- **Submit: **creates the post and routes the user to its detail page.

- **Guidelines: **brief community guidelines visible at posting time.

## 5.7 Profile Page (/profile/me)

- In v1, only the user’s own profile is viewable.

- Display: anonymous identifier, join date (month/year).

- Section 1 — My Posts: paginated list of posts created by the user (title, category, date, comment count, spice level).

- Section 2 — My Active Conversations: posts the user has commented in that count toward their 3 active engagements.

- (Optional) Basic stats: total posts created, total comments made.

## 5.8 Settings Page (/settings)

- **Account: **masked email display, change password, logout, delete account (multi-step confirmation).

- **Legal: **links to Privacy Policy and Terms of Service.

- **Trust \*\***&\***\* Safety: **view blocked users, manage notification preferences (where applicable).

- **Support: **app version, feedback link (mailto: in v1), optional FAQ.

## 5.9 Data Model

### Post

- postId (uuid), title (string), body (string), category (enum)

- createdAt, updatedAt (timestamptz)

- originalPosterId (fk to users), originalPosterAnonymousIdentifier (string)

- participantUserIds (uuid[], max 4 incl. OP) — enforced via trigger

- commentCount (int, denormalized), totalSpiceScore, spiceVoteCount, averageSpiceLevel (numeric)

- isFull (bool, true once 4 unique participants present)

- viewCount (int, optional)

### Comment

- commentId (uuid), postId (fk), userId (fk), userAnonymousIdentifier (string)

- text (string), createdAt (timestamptz)

### User

- userId (uuid — mirrors Supabase auth.users.id)

- email (private), anonymousIdentifier (public, unique)

- createdAt (timestamptz), ageVerifiedAt (timestamptz)

- activePostEngagements (uuid[], max length 3) — maintained by trigger

- postsSpiceVotedOn (jsonb { postId: votedScore }) — prevents revoting

- createdPostIds (uuid[]) — quick profile lookup

### Report (new)

- reportId (uuid), reporterUserId (fk), targetType (enum: post|comment|user), targetId (uuid)

- reason (enum), notes (string), createdAt (timestamptz), status (enum: open|reviewed|actioned)

### Block (new)

- blockId (uuid), blockerUserId (fk), blockedUserId (fk), createdAt (timestamptz)

# 6. Non-Functional Requirements

## Performance

- Cold start under 2.5s on a mid-tier Android device.

- Smooth feed scrolling at 60fps; use FlashList v2.

- Optimistic UI updates for comments and spice votes via TanStack Query.

## Usability

- Intuitive navigation with file-based routing (Expo Router).

- Clear visual hierarchy; modern, warm aesthetic; consistent design language.

## Reliability

- Minimal crashes; Sentry crash reporting from day one.

- Comment counts and spice averages stay consistent (server-side computation).

## Security

- Secure credential storage via Supabase Auth (no passwords ever stored client-side).

- All API traffic over HTTPS.

- Row Level Security (RLS) policies on every table; default deny.

- Rate limiting on post and comment creation to limit spam and abuse.

## Scalability

- Supabase scales to tens of thousands of MAU on the Pro plan; clear upgrade path to dedicated Postgres if needed.

- Realtime channels scoped per post to keep socket fan-out predictable.

# 7. Technical Stack (Revised April 2026)

Summary of changes from v1.1: adopt Expo as the framework layer; switch to Expo Router; replace React Native Paper / NativeBase with NativeWind 5; specify FlashList v2 and Reanimated 4; recommend Supabase as the backend over Firebase; add Sentry for crash reporting and PostHog for product analytics.

## 7.1 Platform & Framework

- **Platform: **iOS and Android, mobile-first.

- **Framework: **Expo (SDK 55+), built on React Native 0.83+ with the New Architecture (Fabric + TurboModules + bridgeless mode). The New Architecture is mandatory in SDK 55; the legacy bridge has been removed from React Native 0.82+.

- **JS engine: **Hermes V1 (default since RN 0.84). Roughly 25% lower memory and faster cold starts vs legacy Hermes.

- **Language: **TypeScript (strict mode).

## 7.2 Frontend Libraries

- **Navigation: **Expo Router v4 — file-based routing, deep linking and universal links built in. Replaces the v1.1 recommendation of React Navigation.

- **State (client): **Zustand 5 — small, fast, ergonomic, works well with React 19 concurrent rendering.

- **State (server): **TanStack Query v5 — fetching, caching, optimistic updates. Pairs naturally with Supabase’s JS client.

- **Styling: **NativeWind 5 — Tailwind utility classes for React Native. Replaces React Native Paper / NativeBase. Gives full design freedom for the warm, distinctive aesthetic Akin needs.

- **Lists: **FlashList v2 (Shopify) — New Architecture rewrite, no size estimates, pixel-perfect scrolling. Use for the feed and category pages.

- **Animations: **Reanimated 4 — UI-thread animations, integrates with Fabric and react-native-gesture-handler.

- **Forms: **React Hook Form (no change).

- **Icons: **lucide-react-native (preferred) or @expo/vector-icons.

- **Date/Time: **date-fns.

## 7.3 Backend & Database

Recommendation: Supabase. Rationale below.

- **Database: **Postgres (managed by Supabase). Akin’s data model is highly relational — users, posts, comments, votes, blocks, reports — with hard invariants (max 4 participants per post, max 3 active engagements per user). These are trivial to enforce as Postgres constraints, foreign keys, and triggers. In Firestore the same rules require Cloud Functions, careful denormalization, and risk drift between client and server.

- **Auth: **Supabase Auth — email/password, email verification, password reset, JWT-based sessions. Integrates directly with RLS so policies are enforced at the database layer regardless of client.

- **Realtime: **Supabase Realtime over Postgres logical replication — used for live comment updates on the post detail page. Channel scope is per post.

- **Edge Functions: **Supabase Edge Functions (TypeScript / Deno) for: anonymous identifier generation with collision retry, report intake, and any abuse-detection logic.

- **Storage: **Supabase Storage — unused in v1 (no media uploads), but available without integrating a separate service.

- **Why not Firebase: **Firestore’s document model fits hierarchical data; Akin’s data is relational. Firestore enforcement of "max 4 participants" requires Cloud Functions and is racy without transactions; Postgres handles this in a single trigger. Supabase also avoids vendor lock-in (it is Postgres) and offers more predictable pricing as you scale.

- **Why not custom Node/Postgres: **unnecessary for v1 scope; would add weeks of infra work without a clear benefit. Supabase covers 95% of what a hand-rolled stack would provide.

## 7.4 Delivery & Operations

- **Builds: **EAS Build — cloud-based iOS/Android builds, no need for local Xcode or Android Studio infrastructure.

- **Submission: **EAS Submit — automated uploads to App Store Connect and Google Play Console.

- **OTA updates: **EAS Update — push JS-only fixes and tweaks without a store review cycle. High-value during early MVP iteration.

- **Crash \*\***&\***\* error reporting: **Sentry (preferred over Crashlytics). Better DX, full source map support for RN, and platform-agnostic if the backend changes later.

- **Product analytics: **PostHog (open-source-friendly, self-host option) or Amplitude. Track funnel events, retention cohorts, and feature usage.

- **CI/CD: **GitHub Actions → EAS Build, with branch-based preview builds for QA.

## 7.5 Testing & QA

- Unit tests: Jest + React Native Testing Library.

- E2E: Maestro (preferred over Detox in 2026; simpler config, faster CI).

- Manual QA: TestFlight (iOS) and Google Play Internal Testing track.

- AI agents generate tests as part of every feature; founder reviews and runs them locally before merging.

## 7.6 Build Process — AI-Agent-First Development

Akin is built by the founder using AI coding agents (Claude Code as primary, optionally Cursor) as the implementation layer. The founder is the product owner, architect, reviewer, and integrator; the agent is the implementer.

- Claude Code Max (~$100–200/month) is the primary tool; Pro at $20/month is the fallback for light periods.

- Cursor Pro ($20/month) is the secondary tool for in-IDE work where the visual editor is faster than the terminal.

- Workflow is PRD-driven: founder writes a tight task brief, agent implements, founder reviews the diff against an acceptance checklist.

- Self-review checklist on every PR before merge: security (auth, RLS, input validation, secrets), data (correct tables, indexes, RLS policies), UX (against design tokens), performance (no N+1, proper memoisation).

- Architecture documentation is maintained as living docs in the repo (ARCHITECTURE.md, DECISIONS.md). Agents read these on every task to stay consistent across sessions.

- Skill files (Claude Code SKILL.md) and Cursor rules files codify project conventions: file structure, RLS patterns, accessibility requirements, copy tone, naming.

- Critical paths (auth flows, RLS policies, payment integration in v2) are reviewed by a paid human expert before they ship to production. Recommended: 2–4 hours per quarter.

_AI agents are an implementation force multiplier, not a replacement for craft. Code quality remains the founder’s responsibility — the agent accelerates typing, the founder is accountable for what ships._

## 7.7 Anonymous Identifier Generation

- Format: [Adjective][Noun][2-4 digit suffix], e.g. CrimsonFox42.

- Generated server-side via a Supabase Edge Function on signup.

- Curated word lists (no offensive combinations) stored in a database table; reviewed by hand before launch.

- Uniqueness enforced via a unique index on the column; collisions retry with a different suffix.

# 8. Debug Tooling for v1.0

User-facing debug pages remain out of scope. Production diagnosis relies on:

- Sentry for crash reports and JS errors.

- Supabase logs and dashboard for backend issues.

- PostHog for behavioural analytics.

- A developer-only menu (visible only in dev/staging builds via **DEV** or an EAS build profile flag) for: viewing local state, clearing AsyncStorage, jumping to specific screens, and toggling feature flags.

# 9. Out of Scope for v1.0

Pulled forward into v1 (was previously deferred):

- User reporting of posts and comments.

- Blocking other anonymous users.

- Manual moderation review queue (admin-only, not in the user app).

- 18+ age gate at signup.

Still out of scope:

- Direct messaging between users.

- Viewing other users’ profiles (self only).

- Push notifications (consider for v1.1 if engagement signal is weak).

- Advanced search (full-text body search).

- Editing/deleting one’s own posts and comments (consider for v1.1).

- Image or media uploads.

- Shadowbanning, automated content moderation beyond keyword filtering.

- Badges, incentives, gamification.

- Changing anonymous identifier post-signup.

- Advanced profile customisation.

# 10. Success Metrics for v1.0

- Number of sign-ups.

- DAU and MAU.

- Average session duration.

- Posts created per active user.

- Comments per active user.

- Distribution of posts across categories.

- Average spice-level ratings.

- Day-1 and Day-7 retention.

- App Store / Play Store rating once public.

- Qualitative feedback on the participant limits (do users find them confusing or engaging?).

- Adoption of the Profile and Create Post features.

- Report rate per 1,000 posts and per 1,000 comments (Trust & Safety health).

# 11. Open Questions / Future Considerations

- Word-list curation for the anonymous identifier generator — source, review process, ongoing maintenance.

- Detailed UX copy for interaction-limit error states.

- Specific community guidelines wording, displayed on the Create Post page and in onboarding.

- Moderation SLA — who reviews reports, how fast, with what tooling?

- Backend strategy for content keyword filtering at post and comment creation time.

- Whether to require email verification before a user can post or comment (recommended: yes).

- Cadence for paid expert code reviews on critical paths (auth, RLS, payments) — quarterly default; adjust based on early findings.

- How to manage Claude Code / Cursor subscription costs at peak build sprints (Max 5x default; Max 20x only if usage warrants).

# Appendix — v1.1 to v1.2 Change Log

- **Build approach: **AI-agent-first development with Claude Code (primary) and Cursor (secondary). Founder is architect and reviewer, not implementer. Added §7.6 documenting the workflow, review discipline, and tooling.

- **Framework: **plain React Native → Expo SDK 55+.

- **Architecture: **unspecified → New Architecture (Fabric + TurboModules + bridgeless), Hermes V1.

- **Navigation: **React Navigation → Expo Router v4.

- **UI library: **React Native Paper / NativeBase (unmaintained) → NativeWind 5.

- **Lists: **unspecified → FlashList v2.

- **Animations: **unspecified → Reanimated 4.

- **Backend: **Firebase or Supabase (tied) → Supabase (clear primary recommendation).

- **Operations: **added Sentry for crash reporting and PostHog for product analytics.

- **Delivery: **added EAS Build, Submit, and Update.

- **Trust \*\***&\***\* Safety: **pulled reporting, blocking, and 18+ gating into v1.

- **Data model: **added Report and Block tables; added ageVerifiedAt on User.
