import type { SellerMetrics } from '@/features/shipments/types';
import { fitVolume } from './volume-buckets';

const point = (day: number) => ({
  start: `2026-08-${String(day).padStart(2, '0')}T03:00:00.000Z`,
  delivered: 1,
  problem: 0,
  open: day,
});
const volume = (
  bucket: 'day' | 'week',
  count: number,
): SellerMetrics['volume'] => ({
  bucket,
  points: Array.from({ length: count }, (_, i) => point(i + 1)),
});

describe('fitVolume', () => {
  it('keeps days where each column stays at 24 px or more', () => {
    expect(fitVolume(volume('day', 14), 14 * 28 + 80)).toMatchObject({
      label: 'day',
      merged: false,
    });
    expect(fitVolume(volume('day', 35), undefined).merged).toBe(false);
  });

  it('merges days into weeks when they would be thinner, keeping the totals', () => {
    const fitted = fitVolume(volume('day', 10), 330);

    expect(fitted.label).toBe('week');
    expect(fitted.points).toHaveLength(2);
    expect(fitted.points[0]).toEqual({
      start: point(1).start,
      delivered: 7,
      problem: 0,
      open: 28,
    });
    expect(fitted.points[1]).toMatchObject({ delivered: 3, open: 27 });
  });

  it('merges weeks in pairs when even they would be thinner', () => {
    const fitted = fitVolume(volume('week', 13), 330);

    expect(fitted.label).toBe('2 weeks');
    expect(fitted.points).toHaveLength(7);
  });
});
