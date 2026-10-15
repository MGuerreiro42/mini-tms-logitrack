import { computeDueAt } from './shipment-due-at';

describe('computeDueAt', () => {
  const createdAt = new Date('2026-01-01T10:00:00Z');

  it('adds the SLA hours to createdAt', () => {
    expect(computeDueAt(createdAt, 48)).toEqual(
      new Date('2026-01-03T10:00:00Z'),
    );
  });

  it('returns createdAt itself for a zero-hour SLA', () => {
    expect(computeDueAt(createdAt, 0)).toEqual(createdAt);
  });

  it('returns null when the modality tracks no SLA', () => {
    expect(computeDueAt(createdAt, null)).toBeNull();
  });
});
