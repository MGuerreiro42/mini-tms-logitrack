import { average, countByStatus, hoursBetween, percentage } from './stats';

describe('stats', () => {
  it('percentage is 0 for an empty total instead of NaN', () => {
    expect(percentage(1, 4)).toBe(25);
    expect(percentage(0, 0)).toBe(0);
  });

  it('average is null for no samples instead of 0', () => {
    expect(average([2, 4])).toBe(3);
    expect(average([])).toBeNull();
  });

  it('hoursBetween returns fractional hours', () => {
    expect(
      hoursBetween(
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-01T01:30:00Z'),
      ),
    ).toBe(1.5);
  });

  it('countByStatus fills every status with 0 and overlays the groups', () => {
    const Status = { A: 'A', B: 'B', C: 'C' } as const;

    expect(countByStatus(Status, [{ status: 'B', _count: 3 }])).toEqual({
      A: 0,
      B: 3,
      C: 0,
    });
  });
});
