// Segmented control row used in Settings (Language, Appearance).
// Three-option pill row matching the existing Settings list aesthetic.

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

export interface SegmentedRowProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

export function SegmentedRow<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SegmentedRowProps<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" testID={testID}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.accessibilityLabel ?? opt.label}
            testID={testID ? `${testID}-${opt.value}` : undefined}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !selected && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.bg.raised,
    borderRadius: 10,
    padding: 4,
    marginHorizontal: 22,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentSelected: {
    backgroundColor: colors.bg.base,
  },
  segmentPressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.fg.tertiary,
  },
  labelSelected: {
    fontFamily: 'Inter Medium',
    fontWeight: '500',
    color: colors.fg.primary,
  },
});
