import { useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';

interface TopBarProps {
  left?: React.ReactNode;
  title?: string;
  right?: React.ReactNode;
  bordered?: boolean;
  serif?: boolean;
  style?: ViewStyle;
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bg.base,
      paddingHorizontal: 0,
      height: 52,
    },
    bordered: {
      borderBottomWidth: 1,
      borderBottomColor: c.border.hairline,
    },
    slot: {
      minWidth: 56,
      flexShrink: 0,
      paddingLeft: 8,
      justifyContent: 'center',
    },
    slotRight: {
      paddingLeft: 0,
      paddingRight: 8,
      alignItems: 'flex-end',
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontFamily: 'Inter Medium',
      fontWeight: '500',
      fontSize: 16,
      color: c.fg.primary,
    },
    titleSerif: {
      fontFamily: 'Source Serif 4',
      fontWeight: '400',
      fontSize: 22,
      letterSpacing: -0.2,
    },
    titlePlaceholder: {
      flex: 1,
    },
  });
}

export function TopBar({ left, title, right, bordered = true, serif = false, style }: TopBarProps) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);
  // Top safe-area inset is applied once at the root layout — do not add it here.
  return (
    <View style={[styles.container, bordered && styles.bordered, style]} accessibilityRole="header">
      <View style={styles.slot}>{left ?? null}</View>

      {title ? (
        <Text
          style={[styles.title, serif && styles.titleSerif]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
      ) : (
        <View style={styles.titlePlaceholder} />
      )}

      <View style={[styles.slot, styles.slotRight]}>{right ?? null}</View>
    </View>
  );
}
