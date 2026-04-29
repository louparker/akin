# Akin

A mobile-first, anonymous discussion app for people navigating modern dating. Built for iOS and Android with Expo.

---

## What is Akin?

Akin lets users post short text discussions across 9 fixed categories. The defining mechanic is **strict participation limits**: each post has at most 4 participants (1 OP + 3 commenters), and each user can be active in at most 3 non-full posts at once. The limits create scarcity, prevent pile-ons, and force conversation quality.

---

## Canonical documentation

| Document | Purpose |
|----------|---------|
| [`CLAUDE.md`](./CLAUDE.md) | Agent rules — read at the start of every session |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System shape, data model, RLS strategy, trigger design |
| [`DECISIONS.md`](./DECISIONS.md) | Append-only architecture decision log |
| [`docs/Akin_PRD_v1.2.md`](./docs/Akin_PRD_v1.2.md) | Full product requirements |
| [`phases/`](./phases/) | Phase-by-phase build plan |

---

## Tech stack

- **Framework:** Expo SDK 55 / React Native 0.83 (New Architecture)
- **Routing:** Expo Router v4
- **Language:** TypeScript (strict mode)
- **Styling:** NativeWind 5
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions) — EU region
- **Package manager:** pnpm 8

See [`CLAUDE.md §3`](./CLAUDE.md) for the full pinned dependency list.

---

## Getting started

### Prerequisites

- Node 22 LTS
- pnpm 8 (`npm install -g pnpm@8`)
- Expo CLI (`pnpm add -g expo-cli`)
- iOS: Xcode 16+ with a simulator
- Android: Android Studio with an emulator (API 33+)
- Maestro CLI (for E2E tests): `brew install mobile-dev-inc/tap/maestro`

### Setup

```bash
git clone https://github.com/louparker/akin.git
cd akin
cp .env.example .env.local   # fill in your values
pnpm install
```

### Run

```bash
pnpm ios        # iOS simulator
pnpm android    # Android emulator
```

### Checks

```bash
pnpm typecheck      # TypeScript
pnpm lint           # ESLint
pnpm format:check   # Prettier
pnpm test           # Jest + RTL
```

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in your values. Required keys:

| Key | Description |
|-----|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN |
| `EXPO_PUBLIC_POSTHOG_KEY` | PostHog project API key |

The Supabase service-role key is **never** an environment variable in the client. It lives only in Supabase function secrets and CI.

---

## Agent skills

The `.claude/skills/` directory contains context-specific guides for the AI agent:

| Skill | When to read |
|-------|-------------|
| [`security/SKILL.md`](./.claude/skills/security/SKILL.md) | Auth, RLS, env vars, PII, self-review checklist |
| [`database/SKILL.md`](./.claude/skills/database/SKILL.md) | Migrations, RLS patterns, participation-limit trigger, pgTAP |
| [`testing/SKILL.md`](./.claude/skills/testing/SKILL.md) | Jest, RTL, MSW, Maestro, CI |
| [`ui/SKILL.md`](./.claude/skills/ui/SKILL.md) | NativeWind, design tokens, FlashList, Reanimated, a11y |
| [`i18n/SKILL.md`](./.claude/skills/i18n/SKILL.md) | Adding strings, sv/en structure, category labels |
| [`moderation/SKILL.md`](./.claude/skills/moderation/SKILL.md) | Reports, blocks, strikes, audit log, moderator role |
