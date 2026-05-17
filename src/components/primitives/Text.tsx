import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';
import { colors } from '@/theme/colors';

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

// Plain object (not StyleSheet.create) to avoid false-positive no-unused-styles errors
// when styles are accessed via a dynamic key. Values are still typed as TextStyle.
const variantMap: Record<TextVariant, TextStyle> = {
  body: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: colors.fg.primary,
  },
  bodyMd: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 22.5,
    color: colors.fg.primary,
  },
  bodyMuted: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: colors.fg.secondary,
  },
  caption: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 16.8,
    color: colors.fg.tertiary,
  },
  label: {
    fontFamily: 'Inter Medium',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16.8,
    color: colors.fg.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  mono: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12.5,
    lineHeight: 17.5,
    color: colors.fg.secondary,
    letterSpacing: 0.1,
  },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 24,
    lineHeight: 30,
    color: colors.fg.primary,
    letterSpacing: -0.3,
  },
  display: {
    fontFamily: 'Source Serif 4',
    fontSize: 30,
    lineHeight: 33,
    color: colors.fg.primary,
    letterSpacing: -0.5,
  },
};

const styles = StyleSheet.create({
  root: {},
});

export function Text({ variant = 'body', style, ...props }: AkinTextProps) {
  // eslint-disable-next-line security/detect-object-injection -- variant is a union type; values are compile-time constants
  const variantStyle = variantMap[variant];
  return <RNText style={[styles.root, variantStyle, style]} {...props} />;
}
