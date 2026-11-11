import { hasEnoughData, notEnoughNote, trendDirection } from './metrics';

describe('metrics', () => {
  it('needs 5 samples before a rate or median counts', () => {
    expect(hasEnoughData(4)).toBe(false);
    expect(hasEnoughData(5)).toBe(true);
    expect(notEnoughNote(3, 'deliveries')).toBe('Not enough deliveries (n=3)');
  });

  it('reads the trend from the first and the last bucket with data', () => {
    expect(trendDirection([null, 80, null, 95, null])).toBe('rising');
    expect(trendDirection([95, 80])).toBe('falling');
    expect(trendDirection([90, 70, 90.5])).toBe('steady');
    expect(trendDirection([null, 90, null])).toBe('steady');
  });
});
