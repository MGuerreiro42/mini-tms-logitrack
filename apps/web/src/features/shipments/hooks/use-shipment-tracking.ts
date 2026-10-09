'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import {
  type SocketSubscription,
  useSocketSubscription,
} from '@/hooks/use-socket-subscription';
import { getSocket } from '@/services/websocket-client';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';

interface UseShipmentTrackingOptions {
  shipmentId?: string;
  subscribeToQueue?: boolean;
  subscribeToMonitoring?: boolean;
}

function roomsFor({
  shipmentId,
  subscribeToQueue,
  subscribeToMonitoring,
}: UseShipmentTrackingOptions): SocketSubscription[] {
  const rooms: SocketSubscription[] = [];
  if (shipmentId)
    rooms.push({ event: 'subscribe:shipment', args: [shipmentId] });
  if (subscribeToQueue) rooms.push({ event: 'subscribe:queue' });
  if (subscribeToMonitoring) rooms.push({ event: 'subscribe:monitoring' });
  return rooms;
}

export function useShipmentTracking(options: UseShipmentTrackingOptions): void {
  const queryClient = useQueryClient();

  useSocketSubscription({
    getSocket,
    connectionKey: useSession()?.token,
    subscriptions: roomsFor(options),
    updateEvent: 'shipment:updated',
    onUpdate: () => invalidateShipmentQueries(queryClient),
  });
}
