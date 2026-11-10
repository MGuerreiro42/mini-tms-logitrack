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
  performance: (window: StatsWindow) =>
    [...carrierKeys.me(), 'performance', window] as const,
  operatorRanking: (window: StatsWindow) =>
    [...carrierKeys.me(), 'operator-ranking', window] as const,
};
