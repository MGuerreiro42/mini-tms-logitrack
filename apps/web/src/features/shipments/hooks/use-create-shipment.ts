'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { createShipment } from '../api';
import type { CreateShipmentInput } from '../types';

export function useCreateShipment() {
  const session = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateShipmentInput) =>
      createShipment(input, session?.token ?? ''),
    onSuccess: (shipment) => {
      queryClient.invalidateQueries({ queryKey: ['shipments', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['shipments', 'status-counts'],
      });
      queryClient.invalidateQueries({
        queryKey: ['shipments', 'dashboard-recent'],
      });
      router.push(`/seller/shipments/${shipment.id}`);
    },
  });
}
