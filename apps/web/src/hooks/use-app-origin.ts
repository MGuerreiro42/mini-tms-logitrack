'use client';

import { useSyncExternalStore } from 'react';

const ENV_ORIGIN = process.env.NEXT_PUBLIC_APP_URL;

const subscribe = () => () => {};

// The server can't know the browser origin; useSyncExternalStore keeps hydration consistent.
export function useAppOrigin(): string {
  return useSyncExternalStore(
    subscribe,
    () => ENV_ORIGIN ?? window.location.origin,
    () => ENV_ORIGIN ?? '',
  );
}
