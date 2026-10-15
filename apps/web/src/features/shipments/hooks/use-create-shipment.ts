'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ROUTES } from '@/lib/routes';
import { createShipment } from '../api';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';
import type { CreateShipmentInput } from '../types';

export function useCreateShipment() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateShipmentInput) => createShipment(input, token),
    onSuccess: (shipment) => {
      invalidateShipmentQueries(queryClient);
      router.push(ROUTES.sellerShipment(shipment.id));
    },
  });
}
