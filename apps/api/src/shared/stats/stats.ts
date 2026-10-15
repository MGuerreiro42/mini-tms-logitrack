export const MS_PER_HOUR = 60 * 60 * 1000;

export const DEFAULT_STATS_WINDOW_DAYS = 90;
export const MAX_STATS_WINDOW_DAYS = 365;

export const daysAgo = (days: number, now = new Date()): Date =>
  new Date(now.getTime() - days * 24 * MS_PER_HOUR);

export const createdSince = (since?: Date): { createdAt: { gte: Date } } => ({
  createdAt: { gte: since ?? daysAgo(DEFAULT_STATS_WINDOW_DAYS) },
});

export const hoursBetween = (from: Date, to: Date): number =>
  (to.getTime() - from.getTime()) / MS_PER_HOUR;

export const percentage = (part: number, total: number): number =>
  total > 0 ? (part / total) * 100 : 0;

export const average = (values: number[]): number | null =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

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
