'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSocketSubscription } from '@/hooks/use-socket-subscription';
import type { LiveConnection } from '@/lib/live-status';
import { getPublicSocket } from '@/services/websocket-client';
import type { TrackingUpdatedEvent } from '../types';
import { publicTrackingKey } from './use-public-tracking';

export function usePublicTrackingSubscription(
  trackingCode: string,
): LiveConnection {
  const queryClient = useQueryClient();
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);

  const status = useSocketSubscription<TrackingUpdatedEvent>({
    getSocket: getPublicSocket,
    connectionKey: trackingCode,
    subscriptions: [{ event: 'subscribe:tracking', args: [trackingCode] }],
    updateEvent: 'tracking:updated',
    onUpdate: (event) => {
      if (event && event.trackingCode !== trackingCode) return;
      if (event) setLastEventAt(new Date());
      queryClient.invalidateQueries({
        queryKey: publicTrackingKey(trackingCode),
      });
    },
  });

  return { status, lastEventAt };
}
