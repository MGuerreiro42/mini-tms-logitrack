'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { hardNavigate } from '@/lib/hard-navigate';
import { ROUTES } from '@/lib/routes';
import { onSessionChangedElsewhere } from '@/lib/session';

export function SessionSync() {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      onSessionChangedElsewhere(() => {
        queryClient.clear();
        hardNavigate(ROUTES.home);
      }),
    [queryClient],
  );

  return null;
}
