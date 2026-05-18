import { useAuthStore } from '@/features/auth/store/useAuthStore';
import SuspendedScreen from '@/components/composed/SuspendedScreen';

export default function SuspendedRoute() {
  const suspendedUntil = useAuthStore((s) => s.profile?.suspended_until ?? '');
  const language = useAuthStore((s) => s.profile?.language ?? 'en');

  return (
    <SuspendedScreen suspendedUntil={suspendedUntil} locale={language === 'sv' ? 'sv' : 'en'} />
  );
}
