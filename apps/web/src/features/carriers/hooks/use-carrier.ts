'use client';

import { useQuery } from '@tanstack/react-query';
import { getDeliveryModalities } from '@/features/modalities/api';
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

// The carrier's enabled modalities with the catalog's SLA hours, which the toggles leave out.
export function useCarrierModalities(id: string) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.modalitiesOf(id),
    queryFn: async () => {
      const [toggles, catalog] = await Promise.all([
        getCarrierModalities(id, token),
        getDeliveryModalities(token),
      ]);
      const on = new Set(toggles.filter((t) => t.enabled).map((t) => t.id));
      return catalog.filter((modality) => on.has(modality.id));
    },
    enabled,
  });
}
