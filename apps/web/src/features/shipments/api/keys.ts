import type { StatsWindow } from '@/hooks/use-stats-window';
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
  adminDetail: (id: string) =>
    [...shipmentKeys.all, 'admin', 'detail', id] as const,
  adminStatusCounts: (query: AdminStatusCountsQuery) =>
    [...shipmentKeys.all, 'admin', 'status-counts', query] as const,
  adminMetrics: (query: AdminStatusCountsQuery) =>
    [...shipmentKeys.all, 'admin', 'metrics', query] as const,
  adminViewCounts: (query: AdminStatusCountsQuery) =>
    [...shipmentKeys.all, 'admin', 'view-counts', query] as const,
  statusCounts: (statsWindow?: StatsWindow) =>
    [...shipmentKeys.all, 'status-counts', statsWindow] as const,
  viewCounts: (statsWindow?: StatsWindow) =>
    [...shipmentKeys.all, 'view-counts', statsWindow] as const,
  queueViewCounts: () => [...shipmentKeys.all, 'queue', 'view-counts'] as const,
  attention: () => [...shipmentKeys.all, 'attention'] as const,
  activity: () => [...shipmentKeys.all, 'activity'] as const,
  metrics: (statsWindow: StatsWindow) =>
    [...shipmentKeys.all, 'metrics', statsWindow] as const,
};

export const eligibleCarriersKey = (
  state: string,
  city: string,
  modalityId: string,
) => ['eligible-carriers', state, city, modalityId] as const;
