'use client';

import { useSyncExternalStore } from 'react';
import { getSessionFromDocument, type Session } from '@/lib/session';
import { subscribeNever } from '@/lib/subscribe-never';

const getServerSession = () => null;

export function useSession(): Session | null {
  return useSyncExternalStore(
    subscribeNever,
    getSessionFromDocument,
    getServerSession,
  );
}
