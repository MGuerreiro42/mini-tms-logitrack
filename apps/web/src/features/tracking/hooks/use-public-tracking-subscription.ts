'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getPublicSocket } from '@/services/websocket-client';
import { useRealtimeStore } from '@/store/realtime-store';
import type { TrackingUpdatedEvent } from '../types';
import { publicTrackingKey } from './use-public-tracking';

export function usePublicTrackingSubscription(trackingCode: string): void {
  const queryClient = useQueryClient();
  const setConnected = useRealtimeStore((state) => state.setConnected);

  useEffect(() => {
    const socket = getPublicSocket();

    function refetch() {
      queryClient.invalidateQueries({
        queryKey: publicTrackingKey(trackingCode),
      });
    }

    // Rooms aren't replayed after a reconnect; the refetch also covers changes since the server render.
    function handleConnect() {
      socket.emit('subscribe:tracking', trackingCode, (ack: { ok: boolean }) =>
        setConnected(ack.ok),
      );
      refetch();
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handleUpdated(event: TrackingUpdatedEvent) {
      if (event.trackingCode === trackingCode) refetch();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('tracking:updated', handleUpdated);
    socket.connect();
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('tracking:updated', handleUpdated);
      socket.disconnect();
      setConnected(false);
    };
  }, [trackingCode, queryClient, setConnected]);
}
