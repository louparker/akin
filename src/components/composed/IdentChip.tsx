import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

interface IdentChipProps {
  name: string;
  you?: boolean;
  size?: 'sm' | 'lg';
}

export function IdentChip({ name, you = false, size = 'sm' }: IdentChipProps) {
  const fontSize = size === 'lg' ? 14 : 12.5;

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={you ? `${name} (you)` : name}
    >
      <View style={[styles.marker, you ? styles.markerYou : styles.markerOther]} />
      <Text style={[styles.name, { fontSize, lineHeight: fontSize * 1.4 }, you && styles.nameYou]}>
        {name}
      </Text>
      {you ? <Text style={styles.youLabel}> (you)</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  marker: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  markerOther: {
    backgroundColor: colors.brand.primarySoft,
    opacity: 0.7,
  },
  markerYou: {
    backgroundColor: colors.you.color,
    opacity: 1,
  },
  name: {
    fontFamily: 'JetBrains Mono',
    color: colors.fg.secondary,
  },
  nameYou: {
    color: colors.you.color,
  },
  youLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.fg.faint,
    lineHeight: 11 * 1.4,
  },
});
