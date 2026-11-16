import { hasEnoughData, notEnoughNote } from './metrics';

describe('metrics', () => {
  it('needs 5 samples before a rate or median counts', () => {
    expect(hasEnoughData(4)).toBe(false);
    expect(hasEnoughData(5)).toBe(true);
    expect(notEnoughNote(3, 'deliveries')).toBe('Not enough deliveries (n=3)');
  });
});
