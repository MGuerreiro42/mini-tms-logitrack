'use client';

import { useQueryClient } from '@tanstack/react-query';
import { hardNavigate } from '@/lib/hard-navigate';
import { clearSession } from '@/lib/session';

export function useLogout(): () => void {
  const queryClient = useQueryClient();

  return () => {
    queryClient.clear();
    clearSession();
    hardNavigate('/login');
  };
}
