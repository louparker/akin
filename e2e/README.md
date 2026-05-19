# Maestro E2E flows

End-to-end flows that exercise the real app binary on a simulator/emulator. Live next to the code so they're easy to find and update alongside features.

See [`.claude/skills/testing/SKILL.md`](../.claude/skills/testing/SKILL.md) §9 for the test pyramid context and the five critical flows we eventually ship.

## Prerequisites

1. Install the Maestro CLI:

   ```bash
   # macOS / Linux
   curl -fsSL "https://get.maestro.mobile.dev" | bash
   # OR via Homebrew on macOS
   brew install mobile-dev-inc/tap/maestro
   ```

   Verify with `maestro --version` (need 1.39+).

2. Have a simulator or emulator running:
   - **iOS:** open Xcode → `Open Developer Tool` → `Simulator`. The default name is `iPhone 15` (matches the script). Adjust the `--device` flag in `package.json` if you use a different simulator.
   - **Android:** start an emulator via Android Studio's Device Manager. The default AVD name is `emulator-5554`.

3. Install the dev app onto the simulator/emulator first:

   ```bash
   pnpm ios       # builds + installs the iOS dev client
   pnpm android   # same for Android
   ```

   Maestro launches the already-installed app — it doesn't build it.

## Running flows

```bash
pnpm test:e2e:ios       # all flows on iOS simulator
pnpm test:e2e:android   # all flows on Android emulator
pnpm exec maestro test e2e/smoke.yaml   # single flow
```

## Current flows

| File               | Covers                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------- |
| `smoke.yaml`       | App launches and shows the welcome screen.                                              |
| `signup.yaml`      | Full signup → email verify (auto-confirm) → identifier reveal → skip onboarding → feed. |
| `create-post.yaml` | Signup → feed → Write tab → guidelines → pick category → submit → see post in feed.     |

> **signup.yaml prerequisite:** Set `SUPABASE_AUTH_AUTO_CONFIRM=true` in your local Supabase config so email verification is instant. **Never enable this in production.**

## Writing flows

- One YAML file per critical journey (`signup.yaml`, `create-post.yaml`, etc.) — not per screen.
- Start every flow with `launchApp: { clearState: true }` so flows are independent.
- Prefer text assertions over `id:` selectors when copy is stable. Use `testID` only when the same text appears in multiple places.
- Keep flows under ~20 steps. If a flow needs more, split it.

The bundle ID for both platforms is `com.ourakin.app` — set in [`app.json`](../app.json) and referenced at the top of every flow.

## CI

E2E doesn't run in the per-PR CI loop yet — it's too slow. Phase 8 wires it into the release pipeline ([`phases/phase-8-polish-launch.md`](../phases/phase-8-polish-launch.md)).
