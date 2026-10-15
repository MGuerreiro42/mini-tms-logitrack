'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/use-session';
import {
  type SocketSubscription,
  useSocketSubscription,
} from '@/hooks/use-socket-subscription';
import type { LiveStatus } from '@/lib/live-status';
import { throttle } from '@/lib/throttle';
import { getSocket } from '@/services/websocket-client';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';

const REFRESH_THROTTLE_MS = 300;

interface UseShipmentTrackingOptions {
  shipmentId?: string;
  shipmentIds?: string[];
  subscribeToQueue?: boolean;
  subscribeToMonitoring?: boolean;
  onEvent?: () => void;
}

function roomsFor({
  shipmentId,
  shipmentIds = [],
  subscribeToQueue,
  subscribeToMonitoring,
}: UseShipmentTrackingOptions): SocketSubscription[] {
  const rooms: SocketSubscription[] = (
    shipmentId ? [shipmentId, ...shipmentIds] : shipmentIds
  ).map((id) => ({ event: 'subscribe:shipment', args: [id] }));
  if (subscribeToQueue) rooms.push({ event: 'subscribe:queue' });
  if (subscribeToMonitoring) rooms.push({ event: 'subscribe:monitoring' });
  return rooms;
}

export function useShipmentTracking(
  options: UseShipmentTrackingOptions,
): LiveStatus {
  const queryClient = useQueryClient();
  const [refresh] = useState(() =>
    throttle(() => invalidateShipmentQueries(queryClient), REFRESH_THROTTLE_MS),
  );

  useEffect(() => refresh.cancel, [refresh]);

  return useSocketSubscription({
    getSocket,
    connectionKey: useSession()?.token,
    subscriptions: roomsFor(options),
    updateEvent: 'shipment:updated',
    onUpdate: (payload) => {
      refresh();
      if (payload) options.onEvent?.();
    },
  });
}
