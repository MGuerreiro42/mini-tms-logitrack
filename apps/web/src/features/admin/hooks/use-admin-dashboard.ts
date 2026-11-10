'use client';

import { useCarrierStatusCounts } from '@/features/carriers/hooks/use-carrier-status-counts';
import { useSellerStatusCounts } from '@/features/sellers/hooks/use-seller-status-counts';
import { useAdminMetrics } from '@/features/shipments/hooks/use-admin-shipments';
import { useShipmentTracking } from '@/features/shipments/hooks/use-shipment-tracking';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { combineQueries } from '@/lib/combine-queries';
import type { ApprovalStatusCounts } from '@/types/status';

export interface AdminDashboardData {
  sellers: ApprovalStatusCounts;
  carriers: ApprovalStatusCounts;
}

export function useAdminDashboard(statsWindow: StatsWindow) {
  const { status: liveStatus } = useShipmentTracking({
    subscribeToMonitoring: true,
  });

  return {
    approvals: combineQueries(
      [useSellerStatusCounts(), useCarrierStatusCounts()] as const,
      ([sellers, carriers]): AdminDashboardData => ({ sellers, carriers }),
    ),
    metrics: useAdminMetrics({ window: statsWindow }, liveStatus),
  };
}
