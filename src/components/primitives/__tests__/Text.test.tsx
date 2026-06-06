import { screen } from '@testing-library/react-native';
import type { TextStyle } from 'react-native';
import { Text, deriveLineHeightOverride } from '@/components/primitives/Text';
import { renderWithProviders } from '@/lib/test-utils/render';

describe('Text', () => {
  it('renders its children', () => {
    renderWithProviders(<Text>Hello Akin</Text>);
    expect(screen.getByText('Hello Akin')).toBeOnTheScreen();
  });

  it('forwards a testID', () => {
    renderWithProviders(<Text testID="greeting">Hej</Text>);
    expect(screen.getByTestId('greeting')).toBeOnTheScreen();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deriveLineHeightOverride — auto-scaling logic
//
// The bug this guards against: a caller overrides fontSize via the style prop
// (e.g. the splash wordmark at 44pt) but inherits the variant's lineHeight
// (33pt for `display`), which clips the larger glyphs. The helper computes
// the variant's design ratio and emits a scaled lineHeight when needed.
// ─────────────────────────────────────────────────────────────────────────────

describe('deriveLineHeightOverride', () => {
  const displayVariant: TextStyle = {
    fontSize: 30,
    lineHeight: 33, // ratio 1.10
  };

  const bodyVariant: TextStyle = {
    fontSize: 14,
    lineHeight: 21, // ratio 1.50
  };

  it('returns undefined when no override is passed', () => {
    expect(deriveLineHeightOverride(displayVariant, null)).toBeUndefined();
  });

  it('returns undefined when the override has no fontSize', () => {
    expect(deriveLineHeightOverride(displayVariant, { color: 'red' })).toBeUndefined();
  });

  it('returns undefined when the override matches the variant fontSize', () => {
    expect(deriveLineHeightOverride(displayVariant, { fontSize: 30 })).toBeUndefined();
  });

  it('returns undefined when the override already specifies lineHeight', () => {
    expect(
      deriveLineHeightOverride(displayVariant, { fontSize: 44, lineHeight: 60 }),
    ).toBeUndefined();
  });

  it('scales lineHeight by the variant ratio for the splash case (display 30→44)', () => {
    // 44 * (33/30) = 44 * 1.10 = 48.4
    expect(deriveLineHeightOverride(displayVariant, { fontSize: 44 })).toBeCloseTo(48.4, 5);
  });

  it('scales lineHeight by the variant ratio for body 14→20', () => {
    // 20 * (21/14) = 20 * 1.5 = 30
    expect(deriveLineHeightOverride(bodyVariant, { fontSize: 20 })).toBeCloseTo(30, 5);
  });

  it('handles fractional fontSize overrides cleanly', () => {
    // 17.5 * (21/14) = 17.5 * 1.5 = 26.25
    expect(deriveLineHeightOverride(bodyVariant, { fontSize: 17.5 })).toBeCloseTo(26.25, 5);
  });

  it('returns undefined if the variant itself has no lineHeight or fontSize', () => {
    expect(deriveLineHeightOverride({ color: 'red' }, { fontSize: 20 })).toBeUndefined();
    expect(deriveLineHeightOverride({ fontSize: 14 }, { fontSize: 20 })).toBeUndefined();
  });

  it('returns undefined if the variant fontSize is zero (defensive)', () => {
    expect(
      deriveLineHeightOverride({ fontSize: 0, lineHeight: 0 }, { fontSize: 20 }),
    ).toBeUndefined();
  });
});
