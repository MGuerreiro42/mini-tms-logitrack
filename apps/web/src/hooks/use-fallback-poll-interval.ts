'use client';

import { useRealtimeStore } from '@/store/realtime-store';

export const FALLBACK_POLL_MS = 5000;

export function useFallbackPollInterval(): number | false {
  const connected = useRealtimeStore((state) => state.connected);
  return connected ? false : FALLBACK_POLL_MS;
}
