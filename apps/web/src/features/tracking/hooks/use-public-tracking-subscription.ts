'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSocketSubscription } from '@/hooks/use-socket-subscription';
import { getPublicSocket } from '@/services/websocket-client';
import type { TrackingUpdatedEvent } from '../types';
import { publicTrackingKey } from './use-public-tracking';

export function usePublicTrackingSubscription(trackingCode: string): void {
  const queryClient = useQueryClient();

  useSocketSubscription<TrackingUpdatedEvent>({
    getSocket: getPublicSocket,
    connectionKey: trackingCode,
    subscriptions: [{ event: 'subscribe:tracking', args: [trackingCode] }],
    updateEvent: 'tracking:updated',
    onUpdate: (event) => {
      if (event && event.trackingCode !== trackingCode) return;
      queryClient.invalidateQueries({
        queryKey: publicTrackingKey(trackingCode),
      });
    },
  });
}
