---
name: ui
description: Read this skill before building any UI — components, screens, animations, lists, forms, or design tokens. Covers NativeWind, FlashList v2, Reanimated 4, accessibility, and the Akin design language.
---

# UI skill

> Activate this skill whenever you write `.tsx`, touch `src/components/`, `src/theme/`, or any file under `app/`.

---

## 0. Safe-area handling — read this first

**The top safe-area inset is applied ONCE, at the root layout** (`app/_layout.tsx` wraps the route slot in `SafeAreaView edges={['top']}`). Every screen is already pushed below the iOS status bar / notch / Dynamic Island.

**Do NOT** in any screen, header, sheet, or component:

- Add `paddingTop: insets.top` to a container.
- Wrap content in another `SafeAreaView` that includes the `'top'` edge (default `<SafeAreaView>` includes all edges — be explicit).
- Try to "fix" a cut-off header by adding magic numbers like `paddingTop: 44`.

**Do** for top-of-screen headers: use plain `paddingTop` for visual spacing only (e.g. `paddingTop: 20` to give the content breathing room below the status-bar area the root already cleared).

**Bottom inset** is per-screen because contexts vary:

- Tab-bar screens (under `app/(main)/`) — tab bar handles its own bottom inset; don't add another.
- Screens with sticky footers (e.g. welcome, full-screen messages) — wrap the footer with `SafeAreaView edges={['bottom']}` or use `Math.max(insets.bottom + N, M)` on its padding.
- Scrolling lists — set `contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}`.

**If you see content cut into the status bar, the bug is almost always one of:**

1. A screen container with hardcoded `paddingTop: <small number>` and no root layout in scope (e.g. a Storybook or test harness) — fine to ignore in those contexts.
2. A new component added a redundant top `SafeAreaView` or `paddingTop: insets.top`. Remove it.
3. The root `SafeAreaView` in `app/_layout.tsx` was removed or had its `edges` changed. Put it back.

---

## 1. The design language in one sentence

Calm, warm, restrained. Akin should feel closer to Substack or Granta than to Tinder. White space is a feature.

Before any meaningful design decision, read `docs/brand.md`. The "What it's definitely NOT" list is non-negotiable, and the five feel-adjectives in §"How it should feel to use" are the test for any new component or screen.

If a design instinct says "make it pop," say no. The product is a place for words.

---

## 2. Design tokens — the only place colours live

These tokens come directly from the design handoff (`akin-handoff.zip`, April 2026). They are the canonical values — do not substitute or invent alternatives.

`src/theme/colors.ts`:

```ts
export const colors = {
  // Surfaces — warm bone, not pure white
  bg: {
    base: '#EFEAE2', // bone — primary app surface
    raised: '#F6F2EB', // cards, elevated surfaces
    sunken: '#FBF8F3', // input fields, modals
    inverse: '#231F21', // shadow grey — dark surfaces
  },
  // Ink
  fg: {
    primary: '#231F21', // shadow grey
    secondary: '#3F3A3B', // inkSoft
    tertiary: '#6A6464', // inkMute
    faint: '#9C9692', // inkFaint — timestamps, placeholders
    inverse: '#EFEAE2', // on dark surfaces
    onAccent: '#FFFFFF',
  },
  // Brand — teal (Dark Slate Grey), NOT aubergine
  brand: {
    primary: '#2C4D55', // teal — links, active tabs, interactive accents
    primarySoft: '#5C7C84', // tealSoft — secondary teal text
    primaryTint: 'rgba(44,77,85,0.08)', // tealTint — subtle backgrounds
  },
  // Spice — rust/flame. Used ONLY on the 1–5 flame icons and spice-vote UI.
  spice: {
    color: '#B54C26', // rust
    soft: 'rgba(181,76,38,0.12)',
  },
  // "You" marker — blue. Used ONLY on the current-user identifier chip.
  you: {
    color: '#788BFF',
    soft: 'rgba(120,139,255,0.10)',
  },
  // Borders + dividers
  border: {
    divider: 'rgba(35,31,33,0.10)',
    hairline: 'rgba(35,31,33,0.06)',
  },
  // Semantic
  semantic: {
    danger: '#A23B2C',
    dangerSoft: 'rgba(162,59,44,0.12)',
    success: '#3F7A5B',
  },
} as const;
```

**Critical colour rules:**

- `brand.primary` is **teal (#2C4D55)** — NOT aubergine, NOT terracotta. No pink, red, or heart colours anywhere.
- `spice.color` (rust) is **only** for flame icons and the spice-vote sheet. Never use it as a general accent.
- `you.color` (blue) is **only** for the "you" chip on identifier components. Nowhere else.
- No saturated brand colours. No hearts, pinks, or reds outside the spice system.

`src/theme/spacing.ts`:

```ts
// 4px scale. Don't use other spacing values.
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  xxxxl: 64,
} as const;
```

`src/theme/typography.ts`:

```ts
export const typography = {
  // Body: Inter (open-source, Google Fonts)
  bodyFamily: 'Inter',
  // Display: Source Serif 4 (open-source, Google Fonts) — confirmed in design handoff
  displayFamily: 'Source Serif 4',
  // Mono: JetBrains Mono (open-source) — used ONLY for anonymous identifiers
  monoFamily: 'JetBrains Mono',
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },
} as const;
```

**Font usage rules:**

- `Source Serif 4` — wordmark ("akin"), post titles, screen headlines, display text. Weight 400 only (no bold serif).
- `Inter` — all body copy, labels, captions, buttons, metadata.
- `JetBrains Mono` — anonymous identifiers (`AmberLark82`) and character counters in the composer. Nowhere else.
- All three fonts load via `expo-font` in the root layout. GT Sectra was considered but not chosen (paid licence; Source Serif 4 is the confirmed free alternative).

**Rules:**

- Never inline a hex colour in a component. Always import from `colors`.
- Never use a magic number for spacing. Always use a `spacing.*` value.
- Tailwind classes that map to these tokens are configured in `tailwind.config.js` — use them via NativeWind.

---

## 3. NativeWind conventions

```tsx
import { Text, View } from '@/components/primitives';

<View className="flex-1 bg-bg-base px-lg py-md">
  <Text className="text-xl font-semibold text-fg-primary">Hello</Text>
</View>;
```

- Class names map to design tokens, configured in `tailwind.config.js`.
- Compose classes via the `cn()` utility from `src/lib/cn.ts` (clsx + tailwind-merge).
- Don't use `style={{ ... }}` props except for dynamic values that can't be expressed via classes (e.g. an interpolated `transform` from Reanimated).

**The primitives layer (`src/components/primitives/`)** wraps RN components with sensible defaults:

```tsx
// src/components/primitives/Text.tsx
import { Text as RNText, type TextProps } from 'react-native';
import { cn } from '@/lib/cn';

type Variant = 'body' | 'bodyMuted' | 'caption' | 'title' | 'display';

export const Text = ({
  variant = 'body',
  className,
  ...props
}: TextProps & { variant?: Variant }) => {
  return <RNText className={cn(variantClasses[variant], className)} {...props} />;
};

const variantClasses: Record<Variant, string> = {
  body: 'text-base text-fg-primary leading-normal',
  bodyMuted: 'text-base text-fg-secondary leading-normal',
  caption: 'text-sm text-fg-tertiary leading-snug',
  title: 'text-xl font-semibold text-fg-primary leading-snug',
  display: 'text-3xl font-display text-fg-primary leading-tight',
};
```

Use the primitive `Text` component everywhere except in tests. Same for `View`, `Pressable`, `Input`.

---

## 4. Accessibility — non-negotiable

Every interactive element has:

- `accessibilityRole` (`'button'`, `'link'`, `'header'`, etc.).
- `accessibilityLabel` if the visible label is unclear or missing.
- `accessibilityHint` for non-obvious behaviour.
- `accessibilityState` for toggles, loading, selected.

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={t('post.spiceVote.label', { score })}
  accessibilityState={{ selected: hasVoted }}
  onPress={handlePress}
>
  <SpiceFlame filled={hasVoted} />
</Pressable>
```

**Other rules:**

- Tap targets are 44x44pt minimum. Use padding to extend hitboxes; don't make icons bigger.
- Contrast is verified at WCAG 2.2 AA (4.5:1 for body, 3:1 for large text). Use the `pa11y` test in CI.
- Dynamic type: respect the user's system text size up to 130%. Don't lock font sizes with `allowFontScaling={false}` except in tabular contexts.
- Reduce-motion: when `useReducedMotion()` returns true, skip animations and transition instantly.

Every screen has a snapshot test that runs the `a11y-check` helper:

```ts
import { renderWithProviders, a11yCheck } from '@/lib/test-utils';

it('feed screen passes a11y checks', () => {
  const { root } = renderWithProviders(<FeedScreen />);
  expect(a11yCheck(root)).toEqual([]);
});
```

---

## 5. Lists — use FlashList v2

For any list that scrolls or has unknown length, use FlashList v2.

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={posts}
  renderItem={({ item }) => <PostCard post={item} />}
  estimatedItemSize={120} // not required in v2 but speeds first render
  keyExtractor={(item) => item.id}
  ItemSeparatorComponent={Divider}
  contentContainerStyle={{ paddingVertical: spacing.md }}
  onEndReached={fetchMore}
  onEndReachedThreshold={0.5}
  refreshing={isRefreshing}
  onRefresh={refetch}
/>;
```

- `keyExtractor` is mandatory. Use the row's UUID.
- Memoise the `renderItem` function with `useCallback` if it captures anything that doesn't change per render.
- Memoise the row component itself with `React.memo` plus a custom equality check.

Don't use `FlatList` except for tiny static lists (< 10 items).

---

## 6. Animation — Reanimated 4

- Animations run on the UI thread. Use `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withSpring`.
- No `Animated` (legacy). No JS-thread animations.
- Spring animations: keep `damping` ≥ 18 and `stiffness` ≤ 120. No bouncy overshoots.
- Default duration 200ms. Anything longer than 350ms feels sluggish.
- Always check `useReducedMotion()` and skip the animation if true.

```tsx
const opacity = useSharedValue(0);

const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
}));

useEffect(() => {
  opacity.value = withTiming(1, { duration: 200 });
}, []);
```

Animations Akin uses, deliberately:

- Soft fade-in for new comments arriving via Realtime.
- Subtle scale on press for interactive cards (0.98 on press in, back to 1 on release).
- Skeleton shimmer on loading states.
- Spice flames brighten on hover/press.

Animations Akin does not use:

- Confetti, sparkles, hearts, anything celebratory.
- Page transitions beyond the OS default.
- Auto-playing motion in the feed.

---

## 7. Loading, empty, and error states — always

Every screen and every async component has all four states designed:

1. **Loading** — skeleton, not a spinner. Match the shape of the real content.
2. **Empty** — friendly, bilingual copy with a clear next action.
3. **Error** — what failed, what to do, a retry button.
4. **Loaded** — the real content.

If you ship a screen with only the "loaded" state, the task isn't done.

```tsx
function FeedScreen() {
  const { data, isLoading, isError, refetch } = useFeed();

  if (isLoading) return <FeedSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (data?.length === 0) return <EmptyFeed />;
  return <PostList posts={data} />;
}
```

---

## 8. Forms — React Hook Form + Zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(150),
  body: z.string().min(1).max(2000),
  category: z.enum([...categories]),
});

type FormValues = z.infer<typeof schema>;

const {
  control,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm<FormValues>({
  resolver: zodResolver(schema),
});
```

- Schemas live in `src/features/<f>/schemas/`.
- The same Zod schema is reused for client and (where applicable) server validation.
- Errors are i18n keys, not hardcoded strings. Map Zod issue paths to i18n keys.

---

## 9. Dark mode

Akin ships with light and dark themes from v1. The user can pick light, dark, or system in Settings.

- Token values for dark mode live in `src/theme/colors.ts` under a `dark` namespace.
- The `useColorTokens()` hook returns the active theme tokens.
- NativeWind variants `dark:bg-bg-base` etc. are wired in `tailwind.config.js`.

---

## 10. Component review checklist

Before committing a new component:

- [ ] Uses primitives (`Text`, `View`, etc.), not raw RN components.
- [ ] No hex colours, no magic spacing values.
- [ ] All four states (loading, empty, error, loaded) handled where applicable.
- [ ] `accessibilityRole` and `accessibilityLabel` on every interactive element.
- [ ] Tap targets ≥ 44pt.
- [ ] Both light and dark themes work — manually tested.
- [ ] Both languages render — manually tested with the longer one (Swedish copy is often 20% longer than English).
- [ ] No layout-breaking when system text size is at 130%.
- [ ] Memoised correctly (no re-renders on parent state changes that don't affect the component's props).
- [ ] No animations on the JS thread.
- [ ] Snapshot test exists. A11y check exists.

---

## 11. Screen inventory & design specs

> Source: `akin-handoff.zip` (April 2026). All screens are 390×844pt (iPhone 14 / design baseline).

### Shared chrome

**TopBar** — 52pt height, `bg.base` background, hairline bottom border. Left slot (56pt): back chevron or Cancel text. Centre: title in Inter 500 / 16pt or serif 22pt for display titles. Right slot (56pt): action or `···` menu.

**TabBar** — 3 tabs only: **Read** (feed icon), **Write** (pencil icon), **You** (user icon). `bg.base` background, hairline top border. 8pt top padding + 28pt bottom (home indicator zone). Active tab: `fg.primary` + weight 600. Inactive: `fg.faint`.

**Bottom sheets** — `rgba(35,31,33,0.4–0.55)` scrim, `bg.base` sheet with `borderRadius: 20` on top corners. 4×36pt drag handle centred at top (colour `border.divider`). Bottom padding 36pt.

**Icons** — hairline stroke weight (1.5px), rounded caps. No filled icons except for the send button and the `···` dots.

### Auth screens

**Welcome** (`(auth)/welcome`)

- Top 2/3: flex content area with `pt: 120`, padding `32`.
- Mono label "Akin" in `fg.tertiary`, 11pt, 2pt letter-spacing, uppercase — above headline.
- Headline: "A quieter place\nto talk about\ndating." — Source Serif 4, 44pt, `-0.8` letter-spacing, `fg.primary`.
- Body: Inter 16pt, `fg.secondary`, max-width 290.
- Bottom: two buttons stacked (gap 12) + ToS note in Inter 11.5pt `fg.faint`.
- Buttons: "Make an account" (primary, lg, full) → signup. "I already have one" (ghost, md, full) → login.

**Sign Up** (`(auth)/signup`)

- TopBar with back. Serif headline "Make an account" 30pt.
- Subtitle: "Email is private. Used only for sign-in and account recovery."
- Fields: EMAIL, PASSWORD (with "At least 8 characters." hint).
- 18+ checkbox block (bordered card, `bg.raised`, `border.hairline`): checkbox + "I am 18 or older." label + explainer.
- CTA: "Continue" (primary, lg, full).

**Identifier Reveal** (`(auth)/identifier-reveal`)

- No TopBar. Full-screen centred layout with `pt: 100`.
- Mono label "This is who you'll be here" above the identifier.
- Identifier displayed as Source Serif 4 52pt: adjective+noun in `fg.primary`, digits in `brand.primary` (teal).
- Explainer copy (Inter 15pt) + divider + example identifiers in mono.
- Buttons: "This is me" (primary, lg, full) + "Try another one" (ghost, sm, full).

**Login** (`(auth)/login`)

- TopBar with back. Serif headline "Welcome back" 30pt.
- Fields: EMAIL, PASSWORD. Forgot password link right-aligned in `brand.primary`.
- CTA: "Sign in" (primary, lg, full).

### Feed screens

**Main Feed** (`(main)/feed` — Read tab)

- Header: serif "akin" wordmark 30pt, letter-spacing -0.5.
- Segment row below wordmark: "All" | "Categories" tabs + sort icon right. Active tab uses `fg.primary` 500-weight with 1.5pt underline; inactive `fg.tertiary`.
- PostCard list (FlashList). Each card: 20/22pt padding, hairline bottom border.
  - Row 1: CategoryTag (teal uppercase 11.5pt, 500-weight, 0.3 letter-spacing) · dot · timestamp (12pt `fg.tertiary`).
  - Title: Source Serif 4 19pt, `-0.2` letter-spacing, `fg.primary`, `lineHeight: 1.3`.
  - Excerpt: Inter 14pt `fg.secondary` `lineHeight: 1.5`, 2-line clamp.
  - Footer row: Ident chip (left) + Capacity dots + "n/4" + optional Spice flames (right).

**Categories Index** (`(main)/feed` — Categories tab)

- Same header structure, "Categories" tab active.
- Each category row: 20/22pt padding, serif name 19pt + sans description 13pt + mono count right + chevron.

**Category Detail** (drill-in from Categories)

- TopBar back. Mono "Category" label + Serif title 32pt + Sans description 14pt.
- Filter pills below: "3+ flames", "Most comments".
- PostCard list.

**Filter Sheet** (bottom sheet)

- "Sort & filter" heading (serif 22pt).
- Sort section: 3 items, checkmark on active.
- Minimum spice section: 6 cells (Any, 1+…5+), `bg.raised` + ink border on selected.
- CTA: "Apply" (primary, lg, full).

**Empty State**

- Header with wordmark only. Centred content: serif italic category name in message + sans CTA copy. One "Start one" secondary button.

### Post screens

**Post Detail** (`(main)/post/[id]`)

- TopBar back + `···` right.
- Post header section (padded, hairline bottom): CategoryTag + timestamp → Serif title 24pt → body copy Inter 15pt `lineHeight: 1.6` → Ident + Capacity.
- Spice section (padded, hairline bottom): "Spice level" mono label + flames (large, 16pt) + average + vote count right.
- "N replies" mono label row.
- Comments: each is padded 14/22pt, hairline top. Ident chip + "OP" badge (teal uppercase 500-weight 10.5pt) + timestamp right → body Inter 14.5pt.
- Bottom reply bar: pill input (rounded-full, `bg.sunken`, `border.divider`) + circular send button (`bg.inverse`, `fg.inverse` icon).

**Conversation Full** (read-only state)

- Same post header. Comments replaced by skeleton placeholder rows (40%/100%/85% width rectangles in `border.divider`).
- Bottom area: `bg.raised` surface, lock icon + "This conversation is full." (500-weight) + explanation copy.

**Already In 3 Sheet** (bottom sheet)

- Serif headline "You're in three conversations already." 24pt.
- List of 3 active conversations: category label + serif truncated title + Capacity dots.
- "Got it" secondary button.

**Spice Vote Sheet** (bottom sheet)

- Serif "How spicy was this?" 22pt + explainer.
- 5 rows: flames + bold label + description. Selected row has `bg.raised` + ink border + checkmark.

### Create screens

**Category Picker** (modal, full-screen)

- TopBar: back + "Pick a category" title.
- Each category row: serif name 17pt + sans description 13pt. Selected row has `bg.raised` + checkmark.

**Guidelines Sheet** (bottom sheet — first post only)

- Serif "Before you post." 24pt.
- 3 rules: bold label + description.
- "Continue" primary button + "Read the full guidelines" ghost text link below.

**Composer** (`(main)/create`)

- TopBar: "Cancel" ghost text left + "Post" ink text right.
- Category row (padded, hairline bottom): mono label "Category" + serif selected name 18pt + chevron.
- Editable title: serif 26pt, `fg.primary`.
- Editable body: Inter 15.5pt, `fg.secondary`, `lineHeight: 1.6`. Cursor is 1.5pt vertical ink bar.
- Bottom bar (`bg.raised`): "Posting as [mono identifier]" copy + char counters in mono 11pt.

### Profile screens

**Profile** (`(main)/you` — You tab)

- TopBar: `···` right only.
- Header section: mono "You are" label + serif identifier 36pt (digits in teal) + join date + post/reply counts.
- Active conversations section (mono "Active conversations" + "n / 3" right): hint copy + list of up to 3 conversations.
- Your posts list.

**Settings** (`(main)/settings`)

- TopBar: back + "Settings".
- Grouped list items: mono group header + rows with chevrons. Danger items (`fg.danger` = rust) have no chevron.

**Report Sheet** (bottom sheet)

- Serif "Report this comment" 22pt + explainer.
- Radio list of 6 reasons. Radio circle is 18×18pt.
- "Send report" primary button.

**Blocked People** (`(main)/settings/blocked`)

- Explanation copy (hairline bottom). List: Ident + block date + "Unblock" ghost button.

### Shared UI components

**Ident chip** — JetBrains Mono 12.5pt. Leading 6×6pt square marker (teal for others, blue for "you"). "you" label in faint sans 11pt after the name. No avatars, no rings, no colour-coded roles.

**Capacity dots** — 4 dots × 6pt. Filled = `brand.primary` (teal). Empty = transparent with `border.divider` ring.

**Spice flames** — 1–5 SVG flames, `spice.color` (rust) filled for active, `fg.faint` at 0.35 opacity for inactive. Sizes: 11pt in feed, 14pt in compose/profile, 16pt in post detail.

**CategoryTag** — Inter 11.5pt, weight 500, uppercase, 0.3 letter-spacing, `brand.primary` (teal). No background pill — just the text.

**Buttons** — 4px border-radius, 200ms ease-out transitions. Heights: sm=36, md=48, lg=54.

- `primary`: `bg.inverse` background, `fg.inverse` text.
- `secondary`: transparent bg, `fg.primary` text + `fg.primary` 1px border.
- `ghost`: transparent bg, `fg.secondary` text, no border.
- `danger`: transparent bg, `spice.color` text + `spice.color` border.

**Fields** — mono uppercase label (12pt 500-weight `fg.tertiary`), `bg.sunken` input area (14–16pt), `border.divider` border, 4px border-radius. Hint text in `fg.faint` 12pt below.
