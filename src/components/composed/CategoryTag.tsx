import { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';

interface CategoryTagProps {
  name: string;
  muted?: boolean;
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    tag: {
      fontFamily: 'Inter Medium',
      fontWeight: '700',
      fontSize: 11.5,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      textDecorationLine: 'underline',
      color: c.brand.primary,
    },
    muted: {
      color: c.fg.tertiary,
    },
  });
}

export function CategoryTag({ name, muted = false }: CategoryTagProps) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <Text style={[styles.tag, muted && styles.muted]} accessibilityRole="text" numberOfLines={1}>
      {name.replace(/_/g, ' ')}
    </Text>
  );
}
