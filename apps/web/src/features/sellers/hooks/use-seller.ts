'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getSeller, getSellerModalities } from '../api';
import { sellerKeys } from '../api/keys';

export function useSeller(id: string) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: sellerKeys.detail(id),
    queryFn: () => getSeller(id, token),
    enabled,
  });
}

export function useSellerModalities(id: string) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: sellerKeys.modalities(id),
    queryFn: () => getSellerModalities(id, token),
    enabled,
  });
}
