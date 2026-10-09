'use client';

import { useApiMutation } from '@/hooks/use-api-mutation';
import { approveSeller, rejectSeller } from '../api';
import { sellerKeys } from '../api/keys';

export function useApproveSeller(id: string) {
  return useApiMutation({
    mutationFn: (_, token) => approveSeller(id, token),
    successMessage: 'Seller approved',
    invalidates: sellerKeys.all,
  });
}

export function useRejectSeller(id: string) {
  return useApiMutation({
    mutationFn: (_, token) => rejectSeller(id, token),
    successMessage: 'Seller rejected',
    invalidates: sellerKeys.all,
  });
}
