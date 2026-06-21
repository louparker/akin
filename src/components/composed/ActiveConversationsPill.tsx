import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';

interface ActiveConversationsPillProps {
  count: number;
}

const MAX = 3;

function backgroundFor(count: number, c: ReturnType<typeof useColorTokens>): string {
  if (count <= 0) return c.fg.primary;
  if (count >= MAX) return c.semantic.danger;
  return c.brand.primary;
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
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
      color: c.bg.raised,
      lineHeight: 14,
    },
  });
}

export function ActiveConversationsPill({ count }: ActiveConversationsPillProps) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);
  const clamped = Math.max(0, count);
  const atLimit = clamped >= MAX;
  const label = t('create.footer.activeConversations.label', { n: String(clamped) });

  const a11yLabel = atLimit ? t('create.footer.activeConversations.a11y.atLimit') : label;

  return (
    <View
      testID="active-conversations-pill"
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[styles.pill, { backgroundColor: backgroundFor(clamped, c) }]}
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
