import type { StatsWindow } from '@/hooks/use-stats-window';
import type { ListCarriersQuery } from '../types';

export const carrierKeys = {
  all: ['carriers'] as const,
  list: (query: ListCarriersQuery) =>
    [...carrierKeys.all, 'list', query] as const,
  detail: (id: string) => [...carrierKeys.all, 'detail', id] as const,
  statusCounts: () => [...carrierKeys.all, 'status-counts'] as const,
  me: () => [...carrierKeys.all, 'me'] as const,
  myModalities: () => [...carrierKeys.me(), 'modalities'] as const,
  coverageAreas: () => [...carrierKeys.me(), 'coverage-areas'] as const,
  // Under the carrier's detail for the admin's by-id reads, under me otherwise.
  performance: (statsWindow: StatsWindow, carrierId?: string) =>
    [...carrierScope(carrierId), 'performance', statsWindow] as const,
  operatorRanking: (statsWindow: StatsWindow, carrierId?: string) =>
    [...carrierScope(carrierId), 'operator-ranking', statsWindow] as const,
  coverageAreasOf: (carrierId: string) =>
    [...carrierKeys.detail(carrierId), 'coverage-areas'] as const,
  modalitiesOf: (carrierId: string) =>
    [...carrierKeys.detail(carrierId), 'modalities'] as const,
};

function carrierScope(carrierId?: string) {
  return carrierId ? carrierKeys.detail(carrierId) : carrierKeys.me();
}
