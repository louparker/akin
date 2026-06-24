// Segmented control row used in Settings (Language, Appearance).
// Three-option pill row matching the existing Settings list aesthetic.

import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';

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

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      backgroundColor: c.bg.raised,
      borderRadius: 12,
      padding: 4,
      marginHorizontal: 22,
      gap: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.divider,
    },
    segment: {
      flex: 1,
      // 44pt min target so each option is comfortably tappable (WCAG 2.2 AA).
      minHeight: 44,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
    },
    // Selected: filled brand teal with white label — an unmistakable active
    // state rather than a faint shade change.
    segmentSelected: {
      backgroundColor: c.brand.primary,
    },
    // Unselected press: a soft brand tint so the tap registers visually.
    segmentPressed: {
      backgroundColor: c.brand.primaryTint,
    },
    segmentSelectedPressed: {
      opacity: 0.9,
    },
    label: {
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.secondary,
    },
    labelSelected: {
      fontFamily: 'Inter Medium',
      fontWeight: '500',
      color: c.fg.onAccent,
    },
  });
}

export function SegmentedRow<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SegmentedRowProps<T>) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

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
              pressed && selected && styles.segmentSelectedPressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
