'use client';

import { useRouter } from 'next/navigation';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { ROUTES } from '@/lib/routes';
import { claimNextShipment } from '../api';
import { shipmentKeys } from '../api/keys';
import type { CarrierShipment } from '../types';

// The API's text for an empty queue; a lost race keeps its own "try again" message.
const EMPTY_QUEUE = 'No shipment is waiting to be claimed';

export function useClaimNext() {
  const router = useRouter();
  const mutation = useApiMutation<void, CarrierShipment>({
    // Navigates as soon as the claim lands, without waiting for the refetch.
    mutationFn: async (_, token) => {
      const shipment = await claimNextShipment(token);
      router.push(ROUTES.carrierShipment(shipment.id));
      return shipment;
    },
    successMessage: (shipment) => `Claimed ${shipment.trackingCode}`,
    conflictMessage: (message) =>
      message === EMPTY_QUEUE ? 'Nothing left to claim' : message,
    invalidates: shipmentKeys.all,
  });
  return { ...mutation, claimNext: () => mutation.mutate() };
}
