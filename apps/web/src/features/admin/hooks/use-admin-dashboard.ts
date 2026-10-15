'use client';

import { useCarrierStatusCounts } from '@/features/carriers/hooks/use-carrier-status-counts';
import { useSellerStatusCounts } from '@/features/sellers/hooks/use-seller-status-counts';
import { combineQueries } from '@/lib/combine-queries';
import type { ApprovalStatusCounts } from '@/types/status';

export interface AdminDashboardData {
  sellers: ApprovalStatusCounts;
  carriers: ApprovalStatusCounts;
}

export function useAdminDashboard() {
  return combineQueries(
    [useSellerStatusCounts(), useCarrierStatusCounts()] as const,
    ([sellers, carriers]): AdminDashboardData => ({ sellers, carriers }),
  );
}
