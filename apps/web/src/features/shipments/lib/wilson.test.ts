import { wilson } from './wilson';

describe('wilson', () => {
  it('gives the 95 % range of a small sample', () => {
    const { low, high } = wilson(7, 9);

    expect(Math.round(low)).toBe(45);
    expect(Math.round(high)).toBe(94);
  });

  it('stays inside 0–100 at the edges', () => {
    expect(wilson(0, 5).low).toBe(0);
    expect(wilson(5, 5).high).toBe(100);
  });
});
