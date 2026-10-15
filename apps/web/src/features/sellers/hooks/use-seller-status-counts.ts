'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getSellerStatusCounts } from '../api';
import { sellerKeys } from '../api/keys';

export function useSellerStatusCounts() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: sellerKeys.statusCounts(),
    queryFn: () => getSellerStatusCounts(token),
    enabled,
  });
}
