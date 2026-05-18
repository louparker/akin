/**
 * Manual Jest stub for posthog-react-native.
 *
 * posthog-react-native is a native module that cannot run in the Jest/Node
 * environment. This stub provides just enough shape for jest.mock() factories
 * in individual test files to override.
 *
 * Individual tests use jest.mock('posthog-react-native', () => ({ ... })) to
 * supply their own mock implementation; this file is only reached when no
 * factory override is present.
 */

export class PostHog {
  capture = jest.fn();
  identify = jest.fn();
  reset = jest.fn();
  alias = jest.fn();
  screen = jest.fn();
  flush = jest.fn();
}
