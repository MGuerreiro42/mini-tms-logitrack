'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { restartApp } from '@/lib/end-session';
import { ROUTES } from '@/lib/routes';
import { onSessionChangedElsewhere } from '@/lib/session';

export function SessionSync() {
  const queryClient = useQueryClient();

  useEffect(
    () => onSessionChangedElsewhere(() => restartApp(queryClient, ROUTES.home)),
    [queryClient],
  );

  return null;
}
