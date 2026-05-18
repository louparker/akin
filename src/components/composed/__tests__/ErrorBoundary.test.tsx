/**
 * ErrorBoundary — unit tests (TDD: written before implementation)
 *
 * Tests:
 * 1. Throwing inside the boundary shows the fallback screen
 * 2. Retry button resets the boundary and re-renders children
 * 3. logger.error is called when an error is thrown
 *
 * React 19 note: In concurrent dev mode, React re-throws errors that were
 * caught by an error boundary as a "concurrent rendering recovery" error at
 * the process level (via act()). We intercept this with a global
 * uncaughtException handler so the error boundary can still be tested.
 * This is a test-environment concern only — it doesn't affect production.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/lib/test-utils/render';
import { ErrorBoundary } from '../ErrorBoundary';
import { logger } from '@/lib/logger';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ── React 19 error suppression ────────────────────────────────────────────────
// React 19's concurrent mode re-throws boundary-caught errors as process-level
// "uncaughtException" after recovery. We suppress just these diagnostic errors
// in the test environment to prevent false crashes. The boundary still catches
// the original error — this is purely a test infrastructure concern.

let uncaughtErrorHandler: ((err: Error) => void) | null = null;

beforeEach(() => {
  uncaughtErrorHandler = (err: Error) => {
    // Only swallow the React 19 concurrent rendering recovery diagnostic.
    // All other uncaught errors should still fail the test.
    if (err.message.includes('There was an error during concurrent rendering')) {
      return;
    }
    throw err;
  };
  process.on('uncaughtException', uncaughtErrorHandler);

  // Suppress React's own console.error for boundary errors (dev noise)
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  if (uncaughtErrorHandler !== null) {
    process.off('uncaughtException', uncaughtErrorHandler);
    uncaughtErrorHandler = null;
  }
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** A component that always throws. */
function AlwaysBomb(): React.JSX.Element {
  throw new Error('test error');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  // Test 1: fallback is shown when child throws
  it('shows the fallback screen when a child throws', () => {
    const { getByText } = renderWithProviders(
      <ErrorBoundary>
        <AlwaysBomb />
      </ErrorBoundary>,
    );

    expect(getByText('Something went wrong.')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();
    expect(getByText('Send feedback')).toBeTruthy();
  });

  // Test 2: retry button resets boundary
  it('resets the boundary and re-renders children when retry is pressed', () => {
    // shouldThrow is controlled from outside the component tree so React's
    // concurrent re-renders don't accidentally flip it.
    let shouldThrow = true;

    function MaybeThrow(): React.JSX.Element {
      if (shouldThrow) {
        throw new Error('controlled error');
      }
      return <></>;
    }

    const { getByText, queryByText } = renderWithProviders(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>,
    );

    // Fallback visible after throw
    expect(getByText('Try again')).toBeTruthy();

    // Disable the throw before pressing retry, so the re-mounted child is safe
    shouldThrow = false;
    fireEvent.press(getByText('Try again'));

    // After reset the fallback is gone
    expect(queryByText('Something went wrong.')).toBeNull();
  });

  // Test 3: logger.error is called
  it('calls logger.error when a child throws', () => {
    renderWithProviders(
      <ErrorBoundary>
        <AlwaysBomb />
      </ErrorBoundary>,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() replaces logger.error; no this-binding needed
    expect(logger.error).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- same as above
    expect(logger.error).toHaveBeenCalledWith(
      'error_boundary_caught',
      expect.objectContaining({ errorCode: expect.stringMatching(/^ERR-[0-9A-F]+$/) }),
    );
  });
});
