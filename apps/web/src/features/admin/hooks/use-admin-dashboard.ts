'use client';

import { useCarrierStatusCounts } from '@/features/carriers/hooks/use-carrier-status-counts';
import { useSellerStatusCounts } from '@/features/sellers/hooks/use-seller-status-counts';
import { useAdminShipmentStatusCounts } from '@/features/shipments/hooks/use-admin-shipments';
import { useShipmentTracking } from '@/features/shipments/hooks/use-shipment-tracking';
import { combineQueries } from '@/lib/combine-queries';
import type { ApprovalStatusCounts } from '@/types/status';

export interface AdminDashboardData {
  sellers: ApprovalStatusCounts;
  carriers: ApprovalStatusCounts;
}

export function useAdminDashboard() {
  const liveStatus = useShipmentTracking({ subscribeToMonitoring: true });

  return {
    approvals: combineQueries(
      [useSellerStatusCounts(), useCarrierStatusCounts()] as const,
      ([sellers, carriers]): AdminDashboardData => ({ sellers, carriers }),
    ),
    shipments: useAdminShipmentStatusCounts({}, liveStatus),
  };
}
