import { slaState } from './sla';

// Wed Oct 14, 09:00 in São Paulo.
const now = new Date('2026-10-14T12:00:00.000Z');
const HOUR = 60;
const minutesFromNow = (minutes: number) =>
  new Date(now.getTime() + minutes * 60_000).toISOString();
const open = (minutesLeft: number, windowHours = 72) => ({
  dueAt: minutesFromNow(minutesLeft),
  createdAt: minutesFromNow(minutesLeft - windowHours * HOUR),
  status: 'IN_TRANSIT' as const,
  now,
});

describe('slaState', () => {
  it.each([
    [18 * HOUR, 72, 'Due in 18 h'],
    [6 * HOUR, 24, 'Due in 6 h'],
    [6 * HOUR - 1, 24, 'Due in 5 h'],
    [59.5, 24, 'Due in 59 min'],
    [0.2, 24, 'Due in 1 min'],
  ] as const)(
    'reads %s min left of a %s h window as due soon: %s',
    (minutes, window, label) => {
      expect(slaState(open(minutes, window))).toEqual({
        kind: 'dueSoon',
        label,
        tone: 'caution',
      });
    },
  );

  it.each([
    [18 * HOUR + 1, 72, 'Due Thu 03:01', 'in 18 h'],
    [6 * HOUR + 1, 24, 'Due Wed 15:01', 'in 6 h'],
    [46 * HOUR, 72, 'Due Fri 07:00', 'in 46 h'],
    [8 * 24 * HOUR, 30 * 24, 'Due Oct 22', 'in 8 d'],
  ] as const)(
    'reads %s min left of a %s h window as on track: %s',
    (minutes, window, label, title) => {
      expect(slaState(open(minutes, window))).toEqual({
        kind: 'onTrack',
        label,
        tone: 'neutral',
        title,
      });
    },
  );

  it.each([
    [-60, 'Late 1 h'],
    [-61, 'Late 2 h'],
    [-0.5, 'Late 1 min'],
    [-47 * HOUR - 1, 'Late 2 d'],
  ] as const)('reads %s min past due as %s', (minutes, label) => {
    expect(slaState(open(minutes))).toEqual({
      kind: 'late',
      label,
      tone: 'critical',
    });
  });

  it('has nothing to show without a due date or once cancelled', () => {
    expect(slaState({ ...open(60), dueAt: null })).toMatchObject({
      kind: 'none',
      label: '—',
    });
    expect(slaState({ ...open(-60), status: 'CANCELLED' }).kind).toBe('none');
  });

  it.each([
    ['FAILED_DELIVERY', 'Failed'],
    ['RETURNED', 'Returned'],
  ] as const)('reads %s as %s, with or without a due date', (status, label) => {
    const expected = { kind: 'failed', label, tone: 'critical' };
    expect(slaState({ ...open(60), status })).toEqual(expected);
    expect(slaState({ ...open(60), dueAt: null, status })).toEqual(expected);
  });

  it.each([
    [-1, 'onTime', 'On time', 'positive'],
    [0, 'onTime', 'On time', 'positive'],
    [0.5, 'deliveredLate', 'Late by 1 min', 'mutedCritical'],
    [8 * HOUR, 'deliveredLate', 'Late by 8 h', 'mutedCritical'],
    [8 * HOUR + 1, 'deliveredLate', 'Late by 9 h', 'mutedCritical'],
    [72 * HOUR, 'deliveredLate', 'Late by 3 d', 'mutedCritical'],
  ] as const)(
    'reads a delivery %s min after the due date as %s',
    (minutes, kind, label, tone) => {
      const dueAt = minutesFromNow(-24 * HOUR);
      const deliveredAt = new Date(
        new Date(dueAt).getTime() + minutes * 60_000,
      ).toISOString();

      expect(
        slaState({ ...open(0), dueAt, deliveredAt, status: 'DELIVERED' }),
      ).toEqual({ kind, label, tone });
    },
  );

  it('just says delivered when the delivery time is unknown', () => {
    expect(slaState({ ...open(-300), status: 'DELIVERED' })).toEqual({
      kind: 'none',
      label: 'Delivered',
      tone: 'neutral',
    });
  });
});
