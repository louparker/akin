import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

interface CapacityDotsProps {
  filled: number;
  total?: number;
  size?: number;
}

export function CapacityDots({ filled, total = 4, size = 6 }: CapacityDotsProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`${filled} of ${total} participants`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { width: size, height: size, borderRadius: size / 2 },
            i < filled ? styles.dotFilled : styles.dotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {},
  dotFilled: {
    backgroundColor: colors.brand.primary,
  },
  dotEmpty: {
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
});
