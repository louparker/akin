# E2E tests — Maestro

E2E flows live in this directory. Each file is one critical user journey. Flows are **not** run on every PR (too slow); they run as part of the release pipeline (Phase 8).

---

## Setup

### 1. Install Maestro CLI

```bash
brew install mobile-dev-inc/tap/maestro
```

Verify:

```bash
maestro --version
```

Maestro requires Java 11+. If `java` is not on your PATH, install it via:

```bash
brew install --cask temurin
```

### 2. Build the development app

E2E tests run against a real native binary — the Expo Go client is **not** sufficient. You need an EAS development build installed on the simulator/emulator.

```bash
# First time: create a development build
eas build --profile development --platform ios   # or android

# Subsequent runs: start the dev server and open the installed build
pnpm ios    # or pnpm android
```

### 3. Start the Metro bundler

```bash
pnpm start
```

Leave this running in a separate terminal while Maestro executes flows.

---

## Running flows

### iOS simulator

```bash
pnpm test:e2e:ios
```

Or run a single flow:

```bash
maestro test e2e/smoke.yaml
```

### Android emulator

```bash
pnpm test:e2e:android
```

### Targeting a specific device

```bash
maestro --device <udid-or-emulator-name> test e2e/smoke.yaml
```

List available devices:

```bash
maestro devices
```

---

## Flows

| File | What it tests |
|------|---------------|
| [`smoke.yaml`](./smoke.yaml) | App launches and home screen is visible |

The 5 critical flows (added in Phase 8):

1. Signup → verify email → identifier reveal → first feed view
2. Create post → see it in the feed
3. Comment on a post until it fills (4 participants)
4. Report a post
5. Block a user → verify their posts disappear

---

## Debugging

**Flow fails immediately:** check the `appId` in the flow file matches the bundle identifier in `app.json` (`com.ourakin.app`).

**Element not found:** use `maestro studio` to inspect the running app and find the correct `id` or `text` to assert.

**App crashes on launch:** check Metro is running and the dev build is installed.
