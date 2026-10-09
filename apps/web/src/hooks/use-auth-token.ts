'use client';

import { useSession } from '@/hooks/use-session';

// Queries stay disabled until the session cookie is readable (never during SSR).
export function useAuthToken(): { token: string; enabled: boolean } {
  const token = useSession()?.token ?? '';
  return { token, enabled: token !== '' };
}
