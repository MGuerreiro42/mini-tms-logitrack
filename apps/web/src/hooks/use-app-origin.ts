'use client';

import { useSyncExternalStore } from 'react';
import { subscribeNever } from '@/lib/subscribe-never';

const ENV_ORIGIN = process.env.NEXT_PUBLIC_APP_URL;

// The server can't know the browser origin; useSyncExternalStore keeps hydration consistent.
export function useAppOrigin(): string {
  return useSyncExternalStore(
    subscribeNever,
    () => ENV_ORIGIN ?? window.location.origin,
    () => ENV_ORIGIN ?? '',
  );
}
