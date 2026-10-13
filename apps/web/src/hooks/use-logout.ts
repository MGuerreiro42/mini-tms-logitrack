'use client';

import { useQueryClient } from '@tanstack/react-query';
import { endSession } from '@/lib/end-session';
import { ROUTES } from '@/lib/routes';

export function useLogout(): () => void {
  const queryClient = useQueryClient();

  return () => endSession(queryClient, ROUTES.login);
}
