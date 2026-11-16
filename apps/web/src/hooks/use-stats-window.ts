'use client';

import { useFilteredPagination } from '@/hooks/use-filtered-pagination';

export const STATS_WINDOWS = ['7d', '30d', '90d'] as const;
export type StatsWindow = (typeof STATS_WINDOWS)[number];
export const DEFAULT_STATS_WINDOW: StatsWindow = '30d';

// "30 d": the short form every windowed label and chip uses.
export const windowLabel = (value: StatsWindow) =>
  `${Number.parseInt(value, 10)} d`;

// The URL keeps the window like a list filter: replace, default omitted, invalid dropped.
export function useStatsWindow() {
  const { filters, setFilter } = useFilteredPagination(
    { window: DEFAULT_STATS_WINDOW },
    { window: STATS_WINDOWS },
  );
  return [
    filters.window,
    (value: StatsWindow) => setFilter('window', value),
  ] as const;
}
