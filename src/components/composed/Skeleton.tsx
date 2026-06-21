import { View, type ViewStyle, type StyleProp } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width, height, borderRadius = 4, style }: SkeletonProps) {
  const c = useColorTokens();
  return (
    <View
      accessibilityRole="none"
      accessibilityElementsHidden
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: c.border.divider,
        },
        style,
      ]}
    />
  );
}
