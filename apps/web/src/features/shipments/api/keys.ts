import type {
  AdminStatusCountsQuery,
  ListAdminShipmentsQuery,
  ListQueueQuery,
  ListShipmentsQuery,
} from '../types';

export const shipmentKeys = {
  all: ['shipments'] as const,
  list: (query: ListShipmentsQuery) =>
    [...shipmentKeys.all, 'list', query] as const,
  detail: (id: string) => [...shipmentKeys.all, 'detail', id] as const,
  queueList: (query: ListQueueQuery) =>
    [...shipmentKeys.all, 'queue', 'list', query] as const,
  queueDetail: (id: string) =>
    [...shipmentKeys.all, 'queue', 'detail', id] as const,
  adminList: (query: ListAdminShipmentsQuery) =>
    [...shipmentKeys.all, 'admin', 'list', query] as const,
  adminStatusCounts: (query: AdminStatusCountsQuery) =>
    [...shipmentKeys.all, 'admin', 'status-counts', query] as const,
  statusCounts: () => [...shipmentKeys.all, 'status-counts'] as const,
  attention: () => [...shipmentKeys.all, 'attention'] as const,
  dashboardRecent: () => [...shipmentKeys.all, 'dashboard-recent'] as const,
  slaSummary: () => [...shipmentKeys.all, 'sla-summary'] as const,
};

export const eligibleCarriersKey = (
  state: string,
  city: string,
  modalityId: string,
) => ['eligible-carriers', state, city, modalityId] as const;
