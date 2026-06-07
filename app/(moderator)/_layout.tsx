// CRITICAL-PATH: moderation — this guard is the single route-level defence.
// RLS on the underlying tables is the true enforcer; this is defence in depth.
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { useIsModerator } from '@/features/moderation/api/useIsModerator';

export default function ModeratorLayout() {
  const { data: isMod, isSuccess } = useIsModerator();

  useEffect(() => {
    if (isSuccess && !isMod) {
      router.replace('/(main)/feed');
    }
  }, [isMod, isSuccess]);

  if (!isSuccess || !isMod) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
