import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';

interface CapacityDotsProps {
  filled: number;
  total?: number;
  size?: number;
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dot: {},
    dotFilled: {
      backgroundColor: c.brand.primary,
    },
    dotEmpty: {
      borderWidth: 1,
      borderColor: c.border.divider,
    },
  });
}

export function CapacityDots({ filled, total = 4, size = 6 }: CapacityDotsProps) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

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
