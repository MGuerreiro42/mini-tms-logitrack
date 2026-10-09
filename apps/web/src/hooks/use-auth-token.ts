'use client';

import { useSession } from '@/hooks/use-session';

export function useAuthToken(): { token: string; enabled: boolean } {
  const token = useSession()?.token ?? '';
  return { token, enabled: token !== '' };
}
