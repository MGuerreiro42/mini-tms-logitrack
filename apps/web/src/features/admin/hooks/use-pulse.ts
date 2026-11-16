'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { apiClient } from '@/services/api-client';

// Each part is null (services false) when the API could not read it (spec 07 FR-027).
export interface Pulse {
  eventsPerMinute: number[] | null;
  sockets: { internal: number; public: number } | null;
  simulator: 'off' | 'running' | 'idle' | null;
  webhooks: {
    n: number;
    successRate: number | null;
    p95Ms: number | null;
  } | null;
  queues: { name: string; waiting: number; failed: number }[];
  services: { database: boolean; redis: boolean };
  chaos: { scenario: string; label: string; endsAt: string } | null;
}

const PULSE_POLL_MS = 5_000;

// Polled and outside shipmentKeys.all: neither the window nor live invalidation touch it.
export function usePulse() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['admin', 'pulse'],
    queryFn: () => apiClient<Pulse>('/admin/pulse', undefined, token),
    enabled,
    refetchInterval: PULSE_POLL_MS,
    // The next poll is the retry, so a failure shows at once.
    retry: false,
  });
}
