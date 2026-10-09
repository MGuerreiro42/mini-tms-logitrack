'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getEligibleCarriers } from '../api';
import { shipmentKeys } from '../api/keys';

export function useEligibleCarriers(
  state: string,
  city: string,
  modalityId: string,
) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: shipmentKeys.eligibleCarriers(state, city, modalityId),
    queryFn: () => getEligibleCarriers(state, city, modalityId, token),
    enabled: enabled && Boolean(state && city && modalityId),
  });
}
