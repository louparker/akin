/**
 * Manual Jest mock for @sentry/react-native.
 *
 * @sentry/react-native initialises native code on import which crashes in Jest/Node.
 * This stub exposes the same API surface used by the app so tests can assert on
 * Sentry calls without touching native modules.
 */

export const init = jest.fn();
export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const addBreadcrumb = jest.fn();
export const setUser = jest.fn();
export const withScope = jest.fn((cb: (scope: unknown) => void) => cb({}));

// Default export mirrors the named-export shape for `import * as Sentry` usage.
const Sentry = {
  init,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  withScope,
};

export default Sentry;
