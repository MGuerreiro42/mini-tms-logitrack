import type { SellerMetrics } from '@/features/shipments/types';

type Volume = SellerMetrics['volume'];

// WCAG 2.5.8 target width, plus the 4 px gap and the axis column the chart spends beside them.
const MIN_COLUMN_PX = 24;
const COLUMN_GAP_PX = 4;
const CHROME_PX = 80;
// Days merge into a week; weeks, already the coarsest the API sends, into pairs.
const MERGE: Record<Volume['bucket'], { size: number; label: string }> = {
  day: { size: 7, label: 'week' },
  week: { size: 2, label: '2 weeks' },
};

// Wider buckets once a column would be thinner than a touch target; as sent where they fit.
export function fitVolume(
  volume: Volume,
  width: number | undefined,
): { points: Volume['points']; label: string; merged: boolean } {
  const fits =
    width === undefined ||
    (width - CHROME_PX) / volume.points.length >= MIN_COLUMN_PX + COLUMN_GAP_PX;
  if (fits)
    return { points: volume.points, label: volume.bucket, merged: false };

  const { size, label } = MERGE[volume.bucket];
  const points = Array.from(
    { length: Math.ceil(volume.points.length / size) },
    (_, index) =>
      volume.points
        .slice(index * size, (index + 1) * size)
        .reduce((sum, point) => ({
          ...sum,
          delivered: sum.delivered + point.delivered,
          problem: sum.problem + point.problem,
          open: sum.open + point.open,
        })),
  );
  return { points, label, merged: true };
}
