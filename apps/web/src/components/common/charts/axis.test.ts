import { axisMax } from './axis';

describe('axisMax', () => {
  it('rounds to a step the shared axis reads cleanly', () => {
    expect(axisMax(21.3)).toBe(40);
    expect(axisMax(1)).toBe(1);
  });

  it('keeps the 2.5 step for hours, with a fractional tick', () => {
    expect(axisMax(10)).toBe(10);
    expect(axisMax(9)).toBe(10);
  });

  it.each([1, 2, 3, 9, 10, 11, 30, 47, 120])(
    'gives whole-number ticks for a count of %s',
    (count) => {
      const max = axisMax(count, true);

      expect(max).toBeGreaterThanOrEqual(count);
      expect(Number.isInteger(max / 4)).toBe(true);
    },
  );
});
