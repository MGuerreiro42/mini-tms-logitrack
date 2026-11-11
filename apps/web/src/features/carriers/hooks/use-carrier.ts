'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  getCarrier,
  getCarrierCoverageAreas,
  getCarrierModalities,
} from '../api';
import { carrierKeys } from '../api/keys';

export function useCarrier(id: string) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.detail(id),
    queryFn: () => getCarrier(id, token),
    enabled,
  });
}

export function useCarrierCoverageAreas(id: string) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.coverageAreasOf(id),
    queryFn: () => getCarrierCoverageAreas(id, token),
    enabled,
  });
}

export function useCarrierModalities(id: string) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.modalitiesOf(id),
    queryFn: () => getCarrierModalities(id, token),
    enabled,
  });
}
