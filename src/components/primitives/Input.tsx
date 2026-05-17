import { View, TextInput, Text, StyleSheet, type TextInputProps } from 'react-native';
import { colors } from '@/theme/colors';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  accessibilityLabel?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  hint,
  placeholder,
  secureTextEntry,
  accessibilityLabel,
  keyboardType,
  autoCapitalize,
  ...props
}: InputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label} accessibilityRole="text">
        {label.toUpperCase()}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.fg.faint}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="text"
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontFamily: 'Inter Medium',
    fontWeight: '500',
    fontSize: 12,
    color: colors.fg.tertiary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.bg.sunken,
    borderWidth: 1,
    borderColor: colors.border.divider,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter',
    color: colors.fg.primary,
  },
  hint: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.fg.faint,
    lineHeight: 12 * 1.4,
  },
});
