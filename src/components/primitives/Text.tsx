import { useMemo } from 'react';
import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';

export type TextVariant =
  | 'body'
  | 'bodyMd'
  | 'bodyMuted'
  | 'caption'
  | 'label'
  | 'mono'
  | 'title'
  | 'display';

interface AkinTextProps extends TextProps {
  variant?: TextVariant;
}

// ─────────────────────────────────────────────────────────────────────────────
// Variant definitions
//
// Each variant declares its design-spec fontSize and lineHeight. The implicit
// ratio (lineHeight / fontSize) is what we honour when callers override the
// fontSize via the `style` prop without overriding lineHeight (see render-time
// auto-scale below). That keeps a Source-Serif "display" at 30→33 looking
// balanced AND a one-off splash override at 44pt automatically becoming 48.4pt
// lineHeight, instead of inheriting 33pt and clipping the glyphs.
//
// Design intent for the ratios:
//   - Body / muted body  → 1.50  (comfortable read at 14–15pt)
//   - Caption / label / mono → 1.40 (small UI text; not for paragraphs)
//   - Title  → 1.25  (24pt headers; tight but uncramped)
//   - Display → 1.10  (30pt+; large display type uses tight leading)
//
// If you add a new variant, pick the closest existing ratio rather than
// inventing a new one — visual rhythm depends on a small set of cadences.
// ─────────────────────────────────────────────────────────────────────────────

function makeVariantMap(c: ReturnType<typeof useColorTokens>): Record<TextVariant, TextStyle> {
  return {
    body: {
      fontFamily: 'Inter',
      fontSize: 14,
      lineHeight: 21, // ratio 1.50
      color: c.fg.primary,
    },
    bodyMd: {
      fontFamily: 'Inter',
      fontSize: 15,
      lineHeight: 22.5, // ratio 1.50
      color: c.fg.primary,
    },
    bodyMuted: {
      fontFamily: 'Inter',
      fontSize: 14,
      lineHeight: 21, // ratio 1.50
      color: c.fg.secondary,
    },
    caption: {
      fontFamily: 'Inter',
      fontSize: 12,
      lineHeight: 16.8, // ratio 1.40
      color: c.fg.tertiary,
    },
    label: {
      fontFamily: 'Inter Medium',
      fontWeight: '500',
      fontSize: 12,
      lineHeight: 16.8, // ratio 1.40
      color: c.fg.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.2,
    },
    mono: {
      fontFamily: 'JetBrains Mono',
      fontSize: 12.5,
      lineHeight: 17.5, // ratio 1.40
      color: c.fg.secondary,
      letterSpacing: 0.1,
    },
    title: {
      fontFamily: 'Source Serif 4',
      fontSize: 24,
      lineHeight: 30, // ratio 1.25
      color: c.fg.primary,
      letterSpacing: -0.3,
    },
    display: {
      fontFamily: 'Source Serif 4',
      fontSize: 30,
      lineHeight: 33, // ratio 1.10
      color: c.fg.primary,
      letterSpacing: -0.5,
    },
  };
}

const styles = StyleSheet.create({
  root: {},
});

/**
 * Compute a scaled lineHeight if (and only if) the caller's style override
 * sets a different fontSize but doesn't supply its own lineHeight.
 *
 * Returns `undefined` when no adjustment is needed, so the caller's style
 * array can be left untouched on the common path.
 *
 * Exported for unit tests; not part of the public component API.
 */
export function deriveLineHeightOverride(
  variantStyle: TextStyle,
  flatOverride: TextStyle | null,
): number | undefined {
  if (!flatOverride) return undefined;
  if (flatOverride.lineHeight !== undefined) return undefined;

  const overrideFontSize = flatOverride.fontSize;
  if (overrideFontSize === undefined) return undefined;
  if (overrideFontSize === variantStyle.fontSize) return undefined;

  const variantFontSize = variantStyle.fontSize;
  const variantLineHeight = variantStyle.lineHeight;
  if (typeof variantFontSize !== 'number' || typeof variantLineHeight !== 'number') {
    return undefined;
  }
  if (variantFontSize === 0) return undefined;

  const ratio = variantLineHeight / variantFontSize;
  return overrideFontSize * ratio;
}

export function Text({ variant = 'body', style, ...props }: AkinTextProps) {
  const c = useColorTokens();
  const variantMap = useMemo(() => makeVariantMap(c), [c]);
  // eslint-disable-next-line security/detect-object-injection -- variant is a union type; values are compile-time constants
  const variantStyle = variantMap[variant];

  // StyleSheet.flatten resolves arrays, nested arrays, and registered styles
  // into a single object, so we can inspect the caller's effective fontSize.
  const flatOverride = style ? StyleSheet.flatten(style) : null;
  const derivedLineHeight = deriveLineHeightOverride(variantStyle, flatOverride ?? null);

  return (
    <RNText
      style={[
        styles.root,
        variantStyle,
        style,
        // Sits last so it wins over the caller's style merge — by construction
        // we only emit it when the caller did NOT specify their own lineHeight.
        derivedLineHeight !== undefined ? { lineHeight: derivedLineHeight } : null,
      ]}
      {...props}
    />
  );
}
