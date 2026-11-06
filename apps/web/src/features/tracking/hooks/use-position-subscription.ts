'use client';

import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import {
  type SocketSubscription,
  useSocketSubscription,
} from '@/hooks/use-socket-subscription';
import { isNewer } from '../lib/vehicle-motion';
import type { LastPosition } from '../types';

interface UsePositionSubscriptionOptions<E extends LastPosition> {
  getSocket: () => Socket;
  connectionKey: string | undefined;
  room: SocketSubscription;
  accepts: (event: E) => boolean;
  queryKey: QueryKey;
}

// Pings arrive every 2 s, so they patch the cached detail instead of refetching it.
export function usePositionSubscription<E extends LastPosition>({
  getSocket,
  connectionKey,
  room,
  accepts,
  queryKey,
}: UsePositionSubscriptionOptions<E>): void {
  const queryClient = useQueryClient();

  useSocketSubscription<E>({
    getSocket,
    connectionKey,
    subscriptions: [room],
    updateEvent: 'tracking:position',
    onUpdate: (event) => {
      if (!event || !accepts(event)) return;
      const { lat, lng, heading, recordedAt } = event;
      queryClient.setQueryData<{ lastPosition: LastPosition | null }>(
        queryKey,
        (old) =>
          old && isNewer(event, old.lastPosition)
            ? { ...old, lastPosition: { lat, lng, heading, recordedAt } }
            : old,
      );
    },
  });
}
