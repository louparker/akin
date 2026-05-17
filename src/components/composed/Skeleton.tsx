import { View, type ViewStyle, type StyleProp } from 'react-native';
import { colors } from '@/theme/colors';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width, height, borderRadius = 4, style }: SkeletonProps) {
  return (
    <View
      accessibilityRole="none"
      accessibilityElementsHidden
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.border.divider,
        },
        style,
      ]}
    />
  );
}
