'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { useSocketSubscription } from '@/hooks/use-socket-subscription';
import { throttle } from '@/lib/throttle';
import { getSocket } from '@/services/websocket-client';
import { carrierKeys } from '../api/keys';

// Aggregates move slowly: one refetch per 10 s is enough, however busy the queue.
const REFRESH_THROTTLE_MS = 10_000;

export function usePerformanceLive() {
  const queryClient = useQueryClient();
  const [refresh] = useState(() =>
    throttle(() => {
      queryClient.invalidateQueries({
        queryKey: [...carrierKeys.me(), 'performance'],
      });
      queryClient.invalidateQueries({
        queryKey: [...carrierKeys.me(), 'operator-ranking'],
      });
    }, REFRESH_THROTTLE_MS),
  );

  useEffect(() => refresh.cancel, [refresh]);

  return useSocketSubscription({
    getSocket,
    connectionKey: useSession()?.token,
    subscriptions: [{ event: 'subscribe:queue' }],
    updateEvent: 'shipment:updated',
    onUpdate: refresh,
  });
}
