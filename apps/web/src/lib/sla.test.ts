import { slaState } from './sla';

const now = new Date('2026-10-14T12:00:00.000Z');
const minutesFromNow = (minutes: number) =>
  new Date(now.getTime() + minutes * 60_000).toISOString();

describe('slaState', () => {
  it.each([
    [46 * 60, 'Due in 46 h', 'muted'],
    [72 * 60, 'Due in 3 d', 'muted'],
    [48 * 60, 'Due in 2 d', 'muted'],
    [48 * 60 - 1, 'Due in 47 h', 'muted'],
    [6 * 60, 'Due in 6 h', 'muted'],
    [6 * 60 - 1, 'Due in 5 h', 'soon'],
    [60, 'Due in 1 h', 'soon'],
    [59.5, 'Due in 59 min', 'soon'],
    [0.2, 'Due in 1 min', 'soon'],
    [-60, '1 h late', 'late'],
    [-61, '2 h late', 'late'],
    [-0.5, '1 min late', 'late'],
    [-47 * 60 - 1, '2 d late', 'late'],
  ] as const)('reads %s min from now as %s', (minutes, label, tone) => {
    expect(
      slaState({ dueAt: minutesFromNow(minutes), status: 'IN_TRANSIT', now }),
    ).toEqual({ label, tone });
  });

  it('has nothing to show without a due date or for closed shipments', () => {
    expect(slaState({ dueAt: null, status: 'PENDING', now }).label).toBe('—');
    expect(
      slaState({ dueAt: minutesFromNow(-300), status: 'CANCELLED', now }).label,
    ).toBe('—');
  });

  it('just says delivered once delivered', () => {
    expect(
      slaState({ dueAt: minutesFromNow(-300), status: 'DELIVERED', now }),
    ).toEqual({ label: 'Delivered', tone: 'muted' });
  });
});
