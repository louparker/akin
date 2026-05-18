import { useColorScheme } from 'react-native';
import { colors, darkColors } from '@/theme/colors';
import { useThemeStore } from '@/features/theme/store/useThemeStore';

export function useColorTokens() {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);

  const effectiveScheme = preference === 'system' ? systemScheme : preference;
  return effectiveScheme === 'dark' ? darkColors : colors;
}
