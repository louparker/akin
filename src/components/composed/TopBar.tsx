import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';

interface TopBarProps {
  left?: React.ReactNode;
  title?: string;
  right?: React.ReactNode;
  bordered?: boolean;
  serif?: boolean;
  style?: ViewStyle;
}

export function TopBar({ left, title, right, bordered = true, serif = false, style }: TopBarProps) {
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

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.base,
    paddingHorizontal: 0,
  },
  bordered: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  slot: {
    width: 56,
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
    color: colors.fg.primary,
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
