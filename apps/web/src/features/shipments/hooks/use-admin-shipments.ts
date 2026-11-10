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

export function useAdminShipment(id: string, liveStatus: LiveStatus) {
  return useLiveQuery({
    queryKey: shipmentKeys.adminDetail(id),
    queryFn: (token) => getAdminShipment(id, token),
    liveStatus,
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

export function useAdminMetrics(
  query: AdminStatusCountsQuery,
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
  query: AdminStatusCountsQuery,
  liveStatus: LiveStatus,
) {
  return useLiveQuery({
    queryKey: shipmentKeys.adminViewCounts(query),
    queryFn: (token) => getAdminShipmentViewCounts(query, token),
    liveStatus,
    keepPrevious: true,
  });
}
