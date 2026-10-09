'use client';

import { useSyncExternalStore } from 'react';
import { getSessionFromDocument, type Session } from '@/lib/session';
import { subscribeNever } from '@/lib/subscribe-never';

const getServerSession = () => null;

// Hydrates as null like the server render, then re-reads the cookie on the client.
export function useSession(): Session | null {
  return useSyncExternalStore(
    subscribeNever,
    getSessionFromDocument,
    getServerSession,
  );
}
