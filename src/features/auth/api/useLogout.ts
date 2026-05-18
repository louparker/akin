import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { resetAllStores } from '@/lib/store-utils';

export function useLogout() {
  const queryClient = useQueryClient();

  async function logout() {
    // Order matters: clear cache first so nothing races against the sign-out.
    queryClient.clear();
    resetAllStores();
    await useAuthStore.getState().signOut();
  }

  return { logout };
}
