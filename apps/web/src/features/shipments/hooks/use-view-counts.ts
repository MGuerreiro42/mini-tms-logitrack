'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getShipmentViewCounts } from '../api';
import { shipmentKeys } from '../api/keys';

export function useSellerViewCounts() {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.viewCounts(),
    queryFn: () => getShipmentViewCounts(token),
    enabled,
  });
}
