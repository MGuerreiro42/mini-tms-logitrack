import { listWhere, searchWhere } from './shipment-views';

describe('shipment views', () => {
  it.each(['01', 'TMS-DE123'])('does not read %s as a zip prefix', (q) => {
    const parts = searchWhere(q, { includeSeller: false }).OR ?? [];
    expect(parts.some((part) => 'addressZipCode' in part)).toBe(false);
  });

  it('adds the window as a createdAt lower bound', () => {
    const now = new Date('2026-01-31T00:00:00Z');
    expect(
      listWhere(
        { sellerId: 's' },
        { window: '30d' },
        { now, carrierUserId: null, includeSeller: false },
      ),
    ).toEqual({
      AND: [
        { sellerId: 's' },
        { createdAt: { gte: new Date('2026-01-01T00:00:00Z') } },
      ],
    });
  });

  it('refuses "mine" without a carrier user', () => {
    expect(() =>
      listWhere(
        {},
        { view: 'mine' },
        { now: new Date(), carrierUserId: null, includeSeller: true },
      ),
    ).toThrow();
  });
});
