import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors } from '@/theme/colors';

export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  kind?: ButtonKind;
  size?: ButtonSize;
  full?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// Plain objects (not StyleSheet.create) to avoid false-positive no-unused-styles errors.
// security/detect-object-injection is suppressed: keys are ButtonKind/ButtonSize union literals.
const containerByKind: Record<ButtonKind, ViewStyle> = {
  primary: { backgroundColor: colors.bg.inverse },
  secondary: {
    // eslint-disable-next-line react-native/no-color-literals -- 'transparent' is not a design token; it means no fill
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.fg.primary,
  },
  ghost: {
    // eslint-disable-next-line react-native/no-color-literals -- 'transparent' is not a design token; it means no fill
    backgroundColor: 'transparent',
  },
  danger: {
    // eslint-disable-next-line react-native/no-color-literals -- 'transparent' is not a design token; it means no fill
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.semantic.danger,
  },
};

const textColorByKind: Record<ButtonKind, TextStyle> = {
  primary: { color: colors.fg.inverse },
  secondary: { color: colors.fg.primary },
  ghost: { color: colors.fg.secondary },
  danger: { color: colors.semantic.danger },
};

const sizeContainer: Record<ButtonSize, ViewStyle> = {
  sm: { height: 36, paddingHorizontal: 14 },
  md: { height: 48, paddingHorizontal: 20 },
  lg: { height: 54, paddingHorizontal: 24 },
};

const sizeText: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: 14 },
  md: { fontSize: 15 },
  lg: { fontSize: 16 },
};

export function Button({
  kind = 'primary',
  size = 'md',
  full = false,
  children,
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
  ...props
}: ButtonProps) {
  const isInert = disabled || loading;
  // eslint-disable-next-line security/detect-object-injection -- kind and size are union literals; no user input
  const containerKindStyle = containerByKind[kind];
  // eslint-disable-next-line security/detect-object-injection -- kind and size are union literals; no user input
  const textKindStyle = textColorByKind[kind];
  // eslint-disable-next-line security/detect-object-injection -- kind and size are union literals; no user input
  const containerSizeStyle = sizeContainer[size];
  // eslint-disable-next-line security/detect-object-injection -- kind and size are union literals; no user input
  const textSizeStyle = sizeText[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isInert }}
      disabled={isInert}
      style={({ pressed }) => [
        styles.base,
        containerKindStyle,
        containerSizeStyle,
        full && styles.full,
        isInert && styles.disabled,
        pressed && !isInert && styles.pressed,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator testID="button-spinner" color={textKindStyle.color} size="small" />
        </View>
      ) : (
        <Text style={[styles.text, textKindStyle, textSizeStyle, disabled && styles.textDisabled]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: {
    width: '100%',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontFamily: 'Inter Medium',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  textDisabled: {
    opacity: 0.6,
  },
});
