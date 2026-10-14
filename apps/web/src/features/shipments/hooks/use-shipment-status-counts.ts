'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getShipmentStatusCounts } from '../api';
import { shipmentKeys } from '../api/keys';

export function useShipmentStatusCounts() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: shipmentKeys.statusCounts(),
    queryFn: () => getShipmentStatusCounts(token),
    enabled,
  });
}
