import { useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, type TextInputProps } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    container: {
      gap: 6,
    },
    label: {
      fontFamily: 'Inter Medium',
      fontWeight: '500',
      fontSize: 12,
      color: c.fg.tertiary,
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: c.bg.sunken,
      borderWidth: 1,
      borderColor: c.border.divider,
      borderRadius: 4,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: 'Inter',
      color: c.fg.primary,
    },
    hint: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: c.fg.faint,
      lineHeight: 12 * 1.4,
    },
    inputError: {
      borderColor: c.semantic.danger,
    },
    errorText: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: c.semantic.danger,
      lineHeight: 12 * 1.4,
    },
  });
}

export function Input({
  label,
  value,
  onChangeText,
  hint,
  error,
  placeholder,
  secureTextEntry,
  accessibilityLabel,
  keyboardType,
  autoCapitalize,
  ...props
}: InputProps) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label} accessibilityRole="text">
        {label.toUpperCase()}
      </Text>
      <TextInput
        style={[styles.input, hasError && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.fg.faint}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="text"
        aria-invalid={hasError || undefined}
        {...props}
      />
      {error ? (
        <Text style={styles.errorText} testID="input-error" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}
