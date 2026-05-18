import { Redirect } from 'expo-router';

import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useEffect } from 'react';

export default function RootIndex() {
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  // eslint-disable-next-line @typescript-eslint/unbound-method -- Zustand actions are closures, not this-bound methods
  const { initialize } = useAuthStore.getState();

  useEffect(() => {
    void initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialize is a stable store action
  }, []);

  if (isLoading) {
    // Keep the splash screen visible while we check auth state.
    return null;
  }

  if (session) {
    return <Redirect href={'/(main)'} />;
  }

  return <Redirect href={'/(auth)'} />;
}
