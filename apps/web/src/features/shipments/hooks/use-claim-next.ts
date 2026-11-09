'use client';

import { useRouter } from 'next/navigation';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { claimNextShipment } from '../api';
import { shipmentKeys } from '../api/keys';
import type { CarrierShipment } from '../types';

export function useClaimNext() {
  const router = useRouter();
  const mutation = useApiMutation<void, CarrierShipment>({
    mutationFn: (_, token) => claimNextShipment(token),
    successMessage: (shipment) => `Claimed ${shipment.trackingCode}`,
    conflictMessage: 'Nothing left to claim',
    invalidates: shipmentKeys.all,
  });
  return {
    ...mutation,
    claimNext: () =>
      mutation.mutate(undefined, {
        onSuccess: (shipment) => router.push(`/carrier/queue/${shipment.id}`),
      }),
  };
}
