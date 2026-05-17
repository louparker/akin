import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function FeedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg.base },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="category/[id]" />
    </Stack>
  );
}
