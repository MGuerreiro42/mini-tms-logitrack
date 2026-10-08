'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSession } from '@/hooks/use-session';
import { getSocket } from '@/services/websocket-client';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';

interface UseShipmentTrackingOptions {
  shipmentId?: string;
  subscribeToQueue?: boolean;
  subscribeToMonitoring?: boolean;
}

export function useShipmentTracking({
  shipmentId,
  subscribeToQueue,
  subscribeToMonitoring,
}: UseShipmentTrackingOptions): void {
  // Depend on the token string, not the session object, to avoid reconnecting on every render.
  const token = useSession()?.token;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    const socket = getSocket();

    function invalidate() {
      invalidateShipmentQueries(queryClient);
    }

    // Rooms aren't replayed after a reconnect, so re-subscribe and refetch to catch up.
    function handleConnect() {
      if (shipmentId) socket.emit('subscribe:shipment', shipmentId);
      if (subscribeToQueue) socket.emit('subscribe:queue');
      if (subscribeToMonitoring) socket.emit('subscribe:monitoring');
      invalidate();
    }

    socket.on('shipment:updated', invalidate);
    socket.on('connect', handleConnect);
    socket.connect();
    if (socket.connected) handleConnect();

    // Safe while each route mounts at most one consumer of this singleton socket.
    return () => {
      socket.off('shipment:updated', invalidate);
      socket.off('connect', handleConnect);
      socket.disconnect();
    };
  }, [token, shipmentId, subscribeToQueue, subscribeToMonitoring, queryClient]);
}
