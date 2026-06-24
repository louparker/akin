// ToggleRowGroup — single-select list rendered as one labelled row per option
// with an on/off switch on the trailing edge. Used in Settings for Language and
// Appearance. Behaves as a radio group: exactly one option is on, and the
// selected option cannot be switched off (the user switches a different option
// on instead). Sits on the raised section background supplied by its parent.

import { useMemo } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';

export interface ToggleRowOption<T extends string> {
  value: T;
  label: string;
}

export interface ToggleRowGroupProps<T extends string> {
  options: ToggleRowOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** When provided, each switch gets testID `${testIDPrefix}-${value}`. */
  testIDPrefix?: string;
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      // 44pt min target keeps each row comfortably tappable (WCAG 2.2 AA).
      minHeight: 44,
      paddingVertical: 12,
      paddingHorizontal: 22,
      gap: 12,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.hairline,
    },
    // Matches the size of the other Settings list rows (15px), not the smaller
    // segmented-control text it replaces.
    label: {
      fontFamily: 'Inter',
      fontSize: 15,
      color: c.fg.primary,
      flex: 1,
    },
  });
}

export function ToggleRowGroup<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: ToggleRowGroupProps<T>) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View>
      {options.map((opt, i) => {
        const selected = opt.value === value;
        const isLast = i === options.length - 1;
        return (
          <View key={opt.value} style={[styles.row, !isLast && styles.rowDivider]}>
            <Text style={styles.label}>{opt.label}</Text>
            <Switch
              testID={testIDPrefix ? `${testIDPrefix}-${opt.value}` : undefined}
              value={selected}
              // Radio semantics: turning a switch ON selects it; attempting to
              // turn the selected switch OFF is ignored (there is always exactly
              // one selection). The controlled `value` snaps it back to on.
              onValueChange={(next) => {
                if (next) onChange(opt.value);
              }}
              accessibilityRole="switch"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={opt.label}
              trackColor={{ true: c.brand.primary, false: c.border.divider }}
            />
          </View>
        );
      })}
    </View>
  );
}
