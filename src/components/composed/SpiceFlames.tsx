import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/colors';

interface SpiceFlamesProps {
  level: number;
  max?: number;
  size?: number;
  color?: string;
}

export function SpiceFlames({ level, max = 5, size = 12, color }: SpiceFlamesProps) {
  const activeColor = color ?? colors.spice.color;

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`Spice level ${level} of ${max}`}
    >
      {Array.from({ length: max }).map((_, i) => {
        const isActive = i < level;
        return <FlameIcon key={i} size={size} isActive={isActive} activeColor={activeColor} />;
      })}
    </View>
  );
}

interface FlameIconProps {
  size: number;
  isActive: boolean;
  activeColor: string;
}

function FlameIcon({ size, isActive, activeColor }: FlameIconProps) {
  return (
    <Svg
      width={size}
      height={(size * 16) / 14}
      viewBox="0 0 14 16"
      style={isActive ? styles.flameActive : styles.flameInactive}
    >
      <Path
        d="M7 1.5c.5 2 2.5 3 2.5 5.5 0 1.2-.5 2-1.2 2.4.4-.6.4-1.6 0-2.2-.4-.6-1-.8-1.3-1.5-.4 1-1.4 1.6-1.4 3 0 .9.4 1.6 1 2-.7-.2-2.5-1.4-2.5-3.8C4.1 4.6 6.5 4 7 1.5z"
        fill={isActive ? activeColor : colors.fg.faint}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  flameActive: {
    opacity: 1,
  },
  flameInactive: {
    opacity: 0.35,
  },
});
