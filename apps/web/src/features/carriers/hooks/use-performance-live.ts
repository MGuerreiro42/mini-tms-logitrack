'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { useSocketSubscription } from '@/hooks/use-socket-subscription';
import type { LiveConnection } from '@/lib/live-status';
import { throttle } from '@/lib/throttle';
import { getSocket } from '@/services/websocket-client';
import { carrierScope } from '../api/keys';

// Aggregates move slowly: one refetch per 10 s is enough, however busy the queue.
export const PERFORMANCE_REFRESH_MS = 10_000;

// The carrier's own (me) or, for the admin's Carrier 360, one carrier's performance and team.
export function usePerformanceRefresh(carrierId?: string): () => void {
  const queryClient = useQueryClient();
  const [refresh] = useState(() =>
    throttle(() => {
      for (const part of ['performance', 'operator-ranking']) {
        queryClient.invalidateQueries({
          queryKey: [...carrierScope(carrierId), part],
        });
      }
    }, PERFORMANCE_REFRESH_MS),
  );

  useEffect(() => refresh.cancel, [refresh]);

  return refresh;
}

export function usePerformanceLive(): LiveConnection {
  const refresh = usePerformanceRefresh();
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);

  const status = useSocketSubscription({
    getSocket,
    connectionKey: useSession()?.token,
    subscriptions: [{ event: 'subscribe:queue' }],
    updateEvent: 'shipment:updated',
    onUpdate: (payload) => {
      refresh();
      if (payload) setLastEventAt(new Date());
    },
  });

  return { status, lastEventAt };
}
