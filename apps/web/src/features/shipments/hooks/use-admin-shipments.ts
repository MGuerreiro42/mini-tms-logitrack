'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import type { LiveStatus } from '@/lib/live-status';
import {
  getAdminMetrics,
  getAdminShipment,
  getAdminShipmentStatusCounts,
  getAdminShipmentViewCounts,
  listAdminShipments,
} from '../api';
import { shipmentKeys } from '../api/keys';
import type { AdminScopeQuery, ListAdminShipmentsQuery } from '../types';

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

const RECENT_LIMIT = 10;

// A tenant page's newest shipments; the total, over all time, says whether it has any.
export function useRecentShipments(
  scope: { sellerId: string } | { carrierId: string },
  liveStatus: LiveStatus,
) {
  return useAdminShipments(
    { ...scope, page: 1, limit: RECENT_LIMIT },
    liveStatus,
  );
}

export function useAdminShipment(id: string, liveStatus: LiveStatus) {
  return useLiveQuery({
    queryKey: shipmentKeys.adminDetail(id),
    queryFn: (token) => getAdminShipment(id, token),
    liveStatus,
  });
}

export function useAdminShipmentStatusCounts(
  query: AdminScopeQuery,
  liveStatus: LiveStatus,
) {
  return useLiveQuery({
    queryKey: shipmentKeys.adminStatusCounts(query),
    queryFn: (token) => getAdminShipmentStatusCounts(query, token),
    liveStatus,
    keepPrevious: true,
  });
}

export function useAdminMetrics(
  query: AdminScopeQuery,
  liveStatus: LiveStatus,
) {
  return useLiveQuery({
    queryKey: shipmentKeys.adminMetrics(query),
    queryFn: (token) => getAdminMetrics(query, token),
    liveStatus,
    keepPrevious: true,
  });
}

export function useAdminShipmentViewCounts(
  query: AdminScopeQuery,
  liveStatus: LiveStatus,
) {
  return useLiveQuery({
    queryKey: shipmentKeys.adminViewCounts(query),
    queryFn: (token) => getAdminShipmentViewCounts(query, token),
    liveStatus,
    keepPrevious: true,
  });
}
