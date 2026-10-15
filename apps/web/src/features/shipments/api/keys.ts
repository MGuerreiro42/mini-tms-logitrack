import type {
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
  statusCounts: () => [...shipmentKeys.all, 'status-counts'] as const,
  dashboardRecent: () => [...shipmentKeys.all, 'dashboard-recent'] as const,
  slaSummary: () => [...shipmentKeys.all, 'sla-summary'] as const,
  eligibleCarriers: (state: string, city: string, modalityId: string) =>
    [
      ...shipmentKeys.all,
      'eligible-carriers',
      state,
      city,
      modalityId,
    ] as const,
};
