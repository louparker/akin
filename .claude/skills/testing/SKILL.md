---
name: testing
description: Read this skill before writing any test or any code that should be tested. Covers TDD discipline, the test pyramid (unit/integration/E2E), mocking conventions for Supabase, pgTAP for the database, and Maestro for E2E flows.
---

# Testing skill

> Activate this skill whenever you are about to write code or write a test. In Akin, those are the same activity — TDD is a hard rule.

---

## 1. The TDD loop, every time

1. Read the acceptance criteria.
2. Write the test that proves the criterion. Run it. Watch it fail. (Red.)
3. Write the minimum code to make the test pass. Run it. Watch it pass. (Green.)
4. Refactor without changing behaviour. Run the tests again. They still pass. (Refactor.)
5. Move to the next criterion.

If you cannot write the test first, you do not understand the requirement clearly enough to implement it. Stop and clarify.

If a test is hard to write, the design is wrong. Refactor the interface, not the test.

---

## 2. The test pyramid for Akin

```
                      ╱╲
                     ╱  ╲       Maestro E2E
                    ╱    ╲      ~5 critical flows
                   ╱──────╲
                  ╱        ╲    Integration tests
                 ╱  feature ╲   ~20-40 per feature
                ╱   tests    ╲
               ╱──────────────╲
              ╱                ╲   Unit tests
             ╱   pure logic     ╲  ~hundreds; fast; cheap
            ╱   utils, hooks,    ╲
           ╱   schemas, reducers  ╲
          ──────────────────────────
                                    pgTAP tests (separate)
                                    Every RLS policy + trigger
```

| Layer | Tool | Speed | What goes here |
| --- | --- | --- | --- |
| Pure logic | Jest | < 10ms / test | Utility functions, Zod schemas, reducers, hooks that don't render. |
| Component | Jest + RTL | 50–500ms / test | Component rendering, props → output, user interactions. Mock the API layer. |
| Integration (feature) | Jest + RTL + MSW | 200ms–2s / test | Wire a feature's screens to mocked Supabase responses. Verify navigation and state. |
| Database | pgTAP | seconds | Every RLS policy, every trigger, every Edge Function. See `database/SKILL.md` §6. |
| E2E | Maestro | 30s–5min / flow | The 5 critical user flows: signup, post, comment up to the limit, report, block. |

Most of the value is in the unit + component + integration layers. E2E is a smoke test, not a regression suite.

---

## 3. Test naming and structure

```ts
describe('useCreatePost', () => {
  describe('when the form is valid', () => {
    it('inserts a new post and invalidates the feed query', async () => { ... });
    it('routes to the new post detail page on success', async () => { ... });
  });

  describe('when the user has already used 3 active slots', () => {
    it('surfaces USER_ACTIVE_LIMIT_REACHED and does not navigate', async () => { ... });
  });

  describe('when network fails', () => {
    it('retries twice then surfaces a NetworkError', async () => { ... });
  });
});
```

- `describe` is a noun ("useCreatePost", "PostCard").
- Inner `describe`s are conditions ("when the form is valid").
- `it` reads as a sentence ("it inserts a new post and …").
- One assertion per `it` where reasonable. If you need 3 assertions, the test name should reflect the bundled behaviour.

---

## 4. Co-location

Tests live next to code in `__tests__` folders:

```
src/features/post/
├── api/
│   └── useCreatePost.ts
├── components/
│   └── CreatePostForm.tsx
├── schemas/
│   └── createPostSchema.ts
└── __tests__/
    ├── useCreatePost.test.ts
    ├── CreatePostForm.test.tsx
    └── createPostSchema.test.ts
```

Why co-located: when you delete or move a feature, the tests come with it. When a test file gets long, you know exactly which feature owns it.

---

## 5. Mocking Supabase

Use Mock Service Worker (MSW) for the HTTP layer, with a typed Supabase response helper:

```ts
// src/lib/test-utils/supabase-mock.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const supabaseServer = setupServer(
  rest.get('https://*.supabase.co/rest/v1/posts', (req, res, ctx) => {
    return res(ctx.json([{ id: '...', title: '...' /* ... */ }]));
  })
);
```

For the JS SDK (`supabase.from(...)`), prefer to mock at the network layer (MSW) over mocking the SDK methods. Reasons:

- Network mocks survive SDK upgrades.
- Network mocks catch URL/header bugs the SDK mocks miss.
- Test feels closer to reality.

For Realtime channels, mock at the SDK level — there's no HTTP layer to intercept:

```ts
jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    })),
  },
}));
```

---

## 6. Test data — fixtures, not factories of factories

Create simple fixture builders:

```ts
// src/lib/test-utils/fixtures.ts
import type { Post } from '@/types';

export const aPost = (overrides: Partial<Post> = {}): Post => ({
  id: '00000000-0000-0000-0000-000000000001',
  title: 'A vent about a third date',
  body: 'It started fine and then…',
  category: 'vent_space',
  language: 'en',
  authorId: '00000000-0000-0000-0000-0000000000aa',
  authorIdentifier: 'CrimsonFox42',
  commentCount: 0,
  participantCount: 1,
  isFull: false,
  totalSpiceScore: 0,
  spiceVoteCount: 0,
  averageSpiceLevel: null,
  status: 'active',
  createdAt: '2026-04-25T10:00:00Z',
  ...overrides,
});

export const aComment = (overrides: Partial<Comment> = {}): Comment => ({ ... });
```

Use them via spread:

```ts
const fullPost = aPost({ participantCount: 4, isFull: true });
const oldPost = aPost({ createdAt: '2025-01-01T00:00:00Z' });
```

Don't build factory hierarchies. They obscure the test.

---

## 7. The renderWithProviders helper

Components that depend on TanStack Query, theme, i18n, navigation need a wrapper:

```ts
// src/lib/test-utils/render.tsx
export const renderWithProviders = (ui: React.ReactElement, options?: RenderOptions) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider locale="en">
          <NavigationContainer>{ui}</NavigationContainer>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>,
    options,
  );
};
```

`retry: false` is critical — TanStack Query's default retry behaviour will hang tests.

---

## 8. Async testing

```ts
import { renderWithProviders, screen, waitFor } from '@/lib/test-utils';

it('shows posts after fetch completes', async () => {
  renderWithProviders(<FeedScreen />);

  // Skeleton initially.
  expect(screen.getByTestId('feed-skeleton')).toBeOnTheScreen();

  // Real content after fetch.
  await waitFor(() => {
    expect(screen.getByText('A vent about a third date')).toBeOnTheScreen();
  });
});
```

- Always use `waitFor` for async assertions.
- Use `findBy*` queries for "wait for it to appear."
- Use `getBy*` for "it should be there now."
- Use `queryBy*` for "it should NOT be there now" (returns null instead of throwing).

---

## 9. E2E with Maestro

Maestro flows live in `e2e/`. One flow file per critical journey. Keep flows short and focused.

```yaml
# e2e/signup-and-post.yaml
appId: com.akin.app
---
- launchApp:
    clearState: true
- assertVisible: "Welcome to Akin"
- tapOn: "Get started"
- inputText: "test+e2e@akin.app"
- tapOn: "Email"
- tapOn: "Password"
- inputText: "Test1234!"
- tapOn: "I am 18 or older"
- tapOn: "Sign up"
- assertVisible:
    text: ".*[A-Z][a-z]+[A-Z][a-z]+\\d+"  # the anonymous identifier reveal
- tapOn: "Continue"
- assertVisible: "Vent Space"
- tapOn:
    id: "create-post-button"
- inputText: "My first vent"
- tapOn: "Body"
- inputText: "Just trying this out."
- tapOn: "Vent Space"
- tapOn: "Post"
- assertVisible: "My first vent"
```

The 5 critical flows:

1. Signup → verify email (mocked) → identifier reveal → first feed view.
2. Create post → see it in the feed.
3. Comment on a post until it fills (using 4 different test accounts).
4. Report a post.
5. Block a user → verify their posts disappear.

---

## 10. CI

GitHub Actions runs on every PR:

1. `pnpm typecheck` — TypeScript, strict.
2. `pnpm lint` — ESLint with security rules.
3. `pnpm test` — Jest, all unit + integration tests.
4. `supabase test db` — pgTAP suite against a fresh local Supabase.
5. `maestro test e2e/` — only on `main` branch merges, not on every PR (slow).

A PR cannot be merged with any failing job. No exceptions.

---

## 11. Coverage targets

Don't chase a number. Chase the right things being tested.

That said, as a sanity check:

- Unit tests: aim for > 90% on pure logic (utils, schemas, reducers).
- Component tests: every meaningful state of every component.
- Integration tests: every user-visible feature has at least one happy-path and one error-path test.
- Database tests: every policy, every trigger, every Edge Function.
- E2E: the 5 critical flows.

If coverage on a feature is low, the question is "what isn't tested?" not "let's add tests to hit a number."

---

## 12. What you do NOT test

- Don't test that React renders. (Don't test framework code.)
- Don't test third-party libraries. (Don't test that TanStack Query caches.)
- Don't test exact strings rendered. (Test that the right i18n key is used.)
- Don't snapshot-test entire screens. (Snapshot small components or specific output.)
- Don't write tests that re-implement the code. ("It calls fn(x) with y" is usually a smell.)

---

## 13. Common test failures and how to read them

- **"Warning: An update to X inside a test was not wrapped in act(...)"** — you have a state update happening after the test ended. Wrap the trigger in `act()` or await a `waitFor`.
- **Test passes locally, fails in CI** — usually a timing issue or unmocked network call. Check that all network is mocked. Check that `retry: false` is set on the test QueryClient.
- **Test hangs** — TanStack Query is retrying. Set `retry: false`.
- **Flaky E2E** — animations interfering. Set `disableAnimations: true` in the Maestro config or wrap in `waitForAnimationToEnd`.
