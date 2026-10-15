'use client';

import { useQuery } from '@tanstack/react-query';
import { fallbackPollInterval, type LiveStatus } from '@/lib/live-status';
import { getPublicTracking } from '../api';
import type { PublicTracking } from '../types';

export function publicTrackingKey(trackingCode: string) {
  return ['public-tracking', trackingCode] as const;
}

export function usePublicTracking(
  initialData: PublicTracking,
  liveStatus: LiveStatus,
) {
  return useQuery({
    queryKey: publicTrackingKey(initialData.trackingCode),
    queryFn: () => getPublicTracking(initialData.trackingCode),
    initialData,
    refetchInterval: fallbackPollInterval(liveStatus),
  });
}
