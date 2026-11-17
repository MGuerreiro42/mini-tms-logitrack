import { deltaOf, promiseSummary, rangeLine } from './overview-rules';

const rate = (count: number, n: number) => ({
  count,
  n,
  rate: n ? (count / n) * 100 : null,
});

describe('deltaOf', () => {
  it('gives the points between two mature windows', () => {
    expect(deltaOf(rate(137, 150), rate(74, 84), true)).toEqual({
      points: 3.2,
      previous: 88.1,
    });
  });

  it('hides when either window has fewer than 5', () => {
    expect(deltaOf(rate(3, 4), rate(80, 84), true)).toBeNull();
    expect(deltaOf(rate(137, 150), rate(3, 4), true)).toBeNull();
  });

  it('waits while the current window is immature', () => {
    expect(deltaOf(rate(137, 150), rate(74, 84), false)).toBe('immature');
  });
});

describe('rangeLine', () => {
  const comparison = {
    since: '2026-08-13T03:00:00.000Z',
    previousSince: '2026-05-15T03:00:00.000Z',
  };
  const now = new Date('2026-11-11T15:00:00.000Z');

  it('dates the window, and the previous one only when compared', () => {
    expect(rangeLine(comparison, false, now)).toBe('Aug 13 – Nov 11');
    expect(rangeLine(comparison, true, now)).toBe(
      'Aug 13 – Nov 11 · compared with May 15 – Aug 12',
    );
  });
});

describe('promiseSummary', () => {
  const stage = (
    status: 'ACCEPTED' | 'IN_TRANSIT',
    p90Hours: number,
    n = 20,
  ) => ({ status, p50Hours: 5, p90Hours, budgetHours: 14, n });

  it('names the slack and the stages whose tail runs late', () => {
    expect(
      promiseSummary([stage('ACCEPTED', 18), stage('IN_TRANSIT', 38)], 41, 72),
    ).toBe(
      'The typical shipment arrives with 1.3 d to spare; lateness lives in the tail of line haul and pickup wait.',
    );
  });

  it('says every tail is within budget, ignoring stages with too few samples', () => {
    expect(
      promiseSummary(
        [stage('ACCEPTED', 10), stage('IN_TRANSIT', 90, 3)],
        41,
        72,
      ),
    ).toBe("Every stage's slow tail sits within budget.");
  });
});
