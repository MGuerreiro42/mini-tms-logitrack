'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import type { LiveStatus } from '@/lib/live-status';
import { getAdminShipmentStatusCounts, listAdminShipments } from '../api';
import { shipmentKeys } from '../api/keys';
import type { AdminStatusCountsQuery, ListAdminShipmentsQuery } from '../types';

export function useAdminShipments(
  query: ListAdminShipmentsQuery,
  liveStatus: LiveStatus,
) {
  return useLiveQuery({
    queryKey: shipmentKeys.adminList(query),
    queryFn: (token) => listAdminShipments(query, token),
    liveStatus,
    keepPrevious: true,
  });
}

export function useAdminShipmentStatusCounts(
  query: AdminStatusCountsQuery,
  liveStatus: LiveStatus,
) {
  return useLiveQuery({
    queryKey: shipmentKeys.adminStatusCounts(query),
    queryFn: (token) => getAdminShipmentStatusCounts(query, token),
    liveStatus,
    keepPrevious: true,
  });
}
