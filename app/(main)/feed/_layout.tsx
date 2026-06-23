import { Stack } from 'expo-router';
import { useColorTokens } from '@/theme/useColorTokens';

export default function FeedLayout() {
  const c = useColorTokens();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg.base },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="category/[id]" />
    </Stack>
  );
}
