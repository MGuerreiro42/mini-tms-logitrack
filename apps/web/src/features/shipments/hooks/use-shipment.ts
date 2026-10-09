'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { getShipment } from '../api';
import { shipmentKeys } from '../api/keys';

export function useShipment(id: string) {
  const { token, enabled } = useAuthToken();
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: shipmentKeys.detail(id),
    queryFn: () => getShipment(id, token),
    enabled,
    refetchInterval: fallbackPollInterval,
  });
}
