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
  performance: (statsWindow: StatsWindow) =>
    [...carrierKeys.me(), 'performance', statsWindow] as const,
  operatorRanking: (statsWindow: StatsWindow) =>
    [...carrierKeys.me(), 'operator-ranking', statsWindow] as const,
};
