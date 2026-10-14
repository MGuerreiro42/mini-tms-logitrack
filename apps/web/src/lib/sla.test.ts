import { slaState } from './sla';

const now = new Date('2026-10-14T12:00:00.000Z');
const hoursFromNow = (hours: number) =>
  new Date(now.getTime() + hours * 3_600_000).toISOString();

describe('slaState', () => {
  it.each([
    [46, 'Due in 46 h', 'muted'],
    [72, 'Due in 3 d', 'muted'],
    [3, 'Due in 3 h', 'soon'],
    [0.5, 'Due in 30 min', 'soon'],
    [-2, '2 h late', 'late'],
  ] as const)('reads %s h from now as %s', (hours, label, tone) => {
    expect(
      slaState({ dueAt: hoursFromNow(hours), status: 'IN_TRANSIT', now }),
    ).toEqual({ label, tone });
  });

  it('has nothing to show without a due date or for closed shipments', () => {
    expect(slaState({ dueAt: null, status: 'PENDING', now }).label).toBe('—');
    expect(
      slaState({ dueAt: hoursFromNow(-5), status: 'CANCELLED', now }).label,
    ).toBe('—');
  });

  it('judges a delivery against the due date when it knows when it happened', () => {
    const dueAt = hoursFromNow(0);

    expect(slaState({ dueAt, status: 'DELIVERED', now })).toEqual({
      label: 'Delivered',
      tone: 'muted',
    });
    expect(
      slaState({ dueAt, status: 'DELIVERED', deliveredAt: hoursFromNow(-1) })
        .label,
    ).toBe('On time');
    expect(
      slaState({ dueAt, status: 'DELIVERED', deliveredAt: hoursFromNow(1) }),
    ).toEqual({ label: 'Delivered late', tone: 'late' });
  });
});
