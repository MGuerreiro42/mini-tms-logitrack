'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { restartApp } from '@/lib/end-session';
import { ROUTES } from '@/lib/routes';
import {
  getSessionFromDocument,
  onSessionChangedElsewhere,
} from '@/lib/session';

export function SessionSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const restart = () => restartApp(queryClient, ROUTES.home);
    const renderedFor = getSessionFromDocument()?.token;

    // Back after logout can bring this shell back from the browser's cache without asking the server.
    if (!renderedFor) restart();

    function handlePageShow(event: PageTransitionEvent) {
      const current = getSessionFromDocument()?.token;
      if (event.persisted && current !== renderedFor) restart();
    }

    window.addEventListener('pageshow', handlePageShow);
    const stopListening = onSessionChangedElsewhere(restart);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      stopListening();
    };
  }, [queryClient]);

  return null;
}
