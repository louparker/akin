import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';

interface ActiveConversationsPillProps {
  count: number;
}

const MAX = 3;

function backgroundFor(count: number): string {
  if (count <= 0) return colors.fg.primary;
  if (count >= MAX) return colors.semantic.danger;
  return colors.brand.primary;
}

export function ActiveConversationsPill({ count }: ActiveConversationsPillProps) {
  const clamped = Math.max(0, count);
  const atLimit = clamped >= MAX;
  const label = t('create.footer.activeConversations.label', { n: String(clamped) });

  const a11yLabel = atLimit ? t('create.footer.activeConversations.a11y.atLimit') : label;

  return (
    <View
      testID="active-conversations-pill"
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[styles.pill, { backgroundColor: backgroundFor(clamped) }]}
    >
      <Text
        testID="active-conversations-pill-text"
        style={styles.text}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    fontWeight: '600',
    color: colors.bg.raised,
    lineHeight: 14,
  },
});
