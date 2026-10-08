'use client';

import { useRealtimeStore } from '@/store/realtime-store';

export const FALLBACK_POLL_MS = 5000;

// WebSocket push is the sync mechanism; polling only covers the gaps while the socket is down.
export function useFallbackPollInterval(): number | false {
  const connected = useRealtimeStore((state) => state.connected);
  return connected ? false : FALLBACK_POLL_MS;
}
