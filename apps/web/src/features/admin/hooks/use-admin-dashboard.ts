'use client';

import { useQueries } from '@tanstack/react-query';
import { getCarrierStatusCounts } from '@/features/carriers/api';
import { getSellerStatusCounts } from '@/features/sellers/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { combineQueries } from '@/lib/combine-queries';
import { sumRecord } from '@/lib/sum-record';

export interface AdminDashboardData {
  sellersTotal: number;
  carriersTotal: number;
  sellersPending: number;
  carriersPending: number;
}

export function useAdminDashboard() {
  const { token, enabled } = useAuthToken();

  return useQueries({
    queries: [
      {
        queryKey: ['sellers', 'status-counts'],
        queryFn: () => getSellerStatusCounts(token),
        enabled,
      },
      {
        queryKey: ['carriers', 'status-counts'],
        queryFn: () => getCarrierStatusCounts(token),
        enabled,
      },
    ],
    combine: (results) =>
      combineQueries(
        results,
        ([sellers, carriers]): AdminDashboardData => ({
          sellersTotal: sumRecord(sellers),
          carriersTotal: sumRecord(carriers),
          sellersPending: sellers.PENDING,
          carriersPending: carriers.PENDING,
        }),
      ),
  });
}
