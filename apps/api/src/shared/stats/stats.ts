export const MS_PER_HOUR = 60 * 60 * 1000;

export const hoursBetween = (from: Date, to: Date): number =>
  (to.getTime() - from.getTime()) / MS_PER_HOUR;

export const percentage = (part: number, total: number): number =>
  total > 0 ? (part / total) * 100 : 0;

export const average = (values: number[]): number | null =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

// Turns a Prisma groupBy over `status` into a count for every enum value, zeros included.
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
