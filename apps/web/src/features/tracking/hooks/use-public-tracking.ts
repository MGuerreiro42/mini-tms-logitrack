'use client';

import { useQuery } from '@tanstack/react-query';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { getPublicTracking } from '../api';
import type { PublicTracking } from '../types';

export function publicTrackingKey(trackingCode: string) {
  return ['public-tracking', trackingCode] as const;
}

export function usePublicTracking(initialData: PublicTracking) {
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: publicTrackingKey(initialData.trackingCode),
    queryFn: () => getPublicTracking(initialData.trackingCode),
    initialData,
    refetchInterval: fallbackPollInterval,
  });
}
