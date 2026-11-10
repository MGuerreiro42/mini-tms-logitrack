export const MS_PER_HOUR = 60 * 60 * 1000;

export const DEFAULT_STATS_WINDOW_DAYS = 90;
export const MAX_STATS_WINDOW_DAYS = 365;

export const WINDOW_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const;
export type StatsWindow = keyof typeof WINDOW_DAYS;

export const daysAgo = (days: number, now = new Date()): Date =>
  new Date(now.getTime() - days * 24 * MS_PER_HOUR);

export const createdSince = (since?: Date): { createdAt: { gte: Date } } => ({
  createdAt: { gte: since ?? daysAgo(DEFAULT_STATS_WINDOW_DAYS) },
});

// A named window wins over an explicit since; neither falls back to the default window.
export const windowSince = (
  { window, since }: { window?: StatsWindow; since?: Date },
  now = new Date(),
): Date =>
  window
    ? daysAgo(WINDOW_DAYS[window], now)
    : (since ?? daysAgo(DEFAULT_STATS_WINDOW_DAYS, now));

export const hoursBetween = (from: Date, to: Date): number =>
  (to.getTime() - from.getTime()) / MS_PER_HOUR;

export const percentage = (part: number, total: number): number =>
  total > 0 ? (part / total) * 100 : 0;

export const average = (values: number[]): number | null =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

// Insertion order is the order each key first appears.
export function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}

// Nearest rank: always a sampled value, never an interpolation; null without samples.
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

export function countByStatus<S extends string>(
  statuses: Record<string, S>,
  groups: { status: S; _count: number }[],
): Record<S, number> {
  const counts = Object.fromEntries(
    Object.values(statuses).map((status) => [status, 0]),
  ) as Record<S, number>;
  for (const group of groups) {
    counts[group.status] = group._count;
  }
  return counts;
}
