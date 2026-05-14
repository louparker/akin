// TODO(akin-1.5-msw): replace this stub with `msw/node`'s `setupServer` once
// the jest-expo 55 + MSW 2.x + pnpm resolver issue is fixed. The interface
// below intentionally mirrors `SetupServerApi` so call sites do not change.
//
// The current issue: jest-expo's React Native test environment hardcodes the
// `react-native` export condition, which MSW deliberately maps to `null`,
// causing jest's resolver to fall back to MSW's `src/` TypeScript source. The
// source then transitively imports `rettime` as a raw ESM `.mjs`, which jest
// cannot parse. Fixing this needs either (a) MSW shipping a `node` entry that
// ignores `react-native: null`, (b) us splitting tests into `jest --projects`
// with a node-only project for anything touching Supabase, or (c) swapping
// MSW for a lighter `fetch` mock. Tracked in the task `wire-msw-into-jest`.

type Handler = unknown;

type Server = {
  listen: (options?: { onUnhandledRequest?: 'error' | 'warn' | 'bypass' }) => void;
  use: (...handlers: Handler[]) => void;
  resetHandlers: () => void;
  close: () => void;
};

export const server: Server = {
  listen: () => {},
  use: () => {
    throw new Error(
      'supabase-mock: MSW is not wired up yet. See TODO(akin-1.5-msw) in src/lib/test-utils/supabase-mock.ts before using server.use().',
    );
  },
  resetHandlers: () => {},
  close: () => {},
};
