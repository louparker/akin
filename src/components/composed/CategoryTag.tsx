import { Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

interface CategoryTagProps {
  name: string;
  muted?: boolean;
}

export function CategoryTag({ name, muted = false }: CategoryTagProps) {
  return (
    <Text style={[styles.tag, muted && styles.muted]} accessibilityRole="text" numberOfLines={1}>
      {name.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  tag: {
    fontFamily: 'Inter Medium',
    fontWeight: '500',
    fontSize: 11.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.brand.primary,
  },
  muted: {
    color: colors.fg.tertiary,
  },
});
