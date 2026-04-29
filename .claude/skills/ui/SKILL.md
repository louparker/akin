---
name: ui
description: Read this skill before building any UI — components, screens, animations, lists, forms, or design tokens. Covers NativeWind, FlashList v2, Reanimated 4, accessibility, and the Akin design language.
---

# UI skill

> Activate this skill whenever you write `.tsx`, touch `src/components/`, `src/theme/`, or any file under `app/`.

---

## 1. The design language in one sentence

Calm, warm, restrained. Akin should feel closer to Substack or Headspace than to Tinder. No saturated red/pink. No bouncy animations. No badges, streaks, or red dots. White space is a feature.

If a design instinct says "make it pop," say no. The product is a place for words.

---

## 2. Design tokens — the only place colours live

`src/theme/colors.ts`:

```ts
export const colors = {
  // Backgrounds
  bg: {
    base: '#FAF7F2',     // warm off-white (light)
    raised: '#FFFFFF',
    sunken: '#F2EEE7',
    inverse: '#1B1419',  // deep aubergine, near-black (dark)
  },
  // Foregrounds
  fg: {
    primary: '#1B1419',
    secondary: '#5C5159',
    tertiary: '#8B8088',
    inverse: '#FAF7F2',
    onAccent: '#FFFFFF',
  },
  // Brand
  brand: {
    primary: '#5B2A4D',   // deep aubergine
    primarySoft: '#E8DCE5',
    accent: '#C2664A',    // warm terracotta
    accentSoft: '#F2DDD2',
  },
  // Semantic
  semantic: {
    danger: '#A23B2C',
    dangerSoft: '#F2D9D5',
    success: '#3F7A5B',
    successSoft: '#DBE8E0',
    warning: '#A87A2C',
    warningSoft: '#F2E5C8',
  },
  // Spice (1–5 flames) — interpolated
  spice: ['#F2DDD2', '#E8B59C', '#D88E6F', '#C2664A', '#A23B2C'],
  // Borders + dividers
  border: {
    subtle: '#EDE6DD',
    default: '#DCD3C7',
    strong: '#B8AC9D',
  },
} as const;
```

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
  // Body: humanist sans
  bodyFamily: 'Inter',
  // Display: soft serif for warmth
  displayFamily: 'GT Sectra',
  sizes: {
    xs: 12, sm: 14, base: 16, lg: 18, xl: 20, xxl: 24, xxxl: 30, display: 36,
  },
  weights: {
    regular: '400', medium: '500', semibold: '600', bold: '700',
  },
  lineHeight: {
    tight: 1.2, snug: 1.35, normal: 1.5, relaxed: 1.65,
  },
} as const;
```

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
</View>
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

export const Text = ({ variant = 'body', className, ...props }: TextProps & { variant?: Variant }) => {
  return (
    <RNText
      className={cn(variantClasses[variant], className)}
      {...props}
    />
  );
};

const variantClasses: Record<Variant, string> = {
  body:       'text-base text-fg-primary leading-normal',
  bodyMuted:  'text-base text-fg-secondary leading-normal',
  caption:    'text-sm text-fg-tertiary leading-snug',
  title:      'text-xl font-semibold text-fg-primary leading-snug',
  display:    'text-3xl font-display text-fg-primary leading-tight',
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
  keyExtractor={item => item.id}
  ItemSeparatorComponent={Divider}
  contentContainerStyle={{ paddingVertical: spacing.md }}
  onEndReached={fetchMore}
  onEndReachedThreshold={0.5}
  refreshing={isRefreshing}
  onRefresh={refetch}
/>
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

const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
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
