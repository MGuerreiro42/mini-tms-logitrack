'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { useSocketSubscription } from '@/hooks/use-socket-subscription';
import type { LiveConnection } from '@/lib/live-status';
import { throttle } from '@/lib/throttle';
import { getSocket } from '@/services/websocket-client';
import { carrierKeys } from '../api/keys';

// Aggregates move slowly: one refetch per 10 s is enough, however busy the queue.
export const PERFORMANCE_REFRESH_MS = 10_000;

export function usePerformanceLive(): LiveConnection {
  const queryClient = useQueryClient();
  const [refresh] = useState(() =>
    throttle(() => {
      queryClient.invalidateQueries({
        queryKey: [...carrierKeys.me(), 'performance'],
      });
      queryClient.invalidateQueries({
        queryKey: [...carrierKeys.me(), 'operator-ranking'],
      });
    }, PERFORMANCE_REFRESH_MS),
  );
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);

  useEffect(() => refresh.cancel, [refresh]);

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
