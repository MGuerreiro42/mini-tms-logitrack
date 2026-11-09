import { listWhere, searchWhere } from './shipment-views';

describe('shipment views', () => {
  it.each(['01', 'TMS-DE123'])('does not read %s as a zip prefix', (q) => {
    const parts = searchWhere(q, { includeSeller: false }).OR ?? [];
    expect(parts.some((part) => 'addressZipCode' in part)).toBe(false);
  });

  it('never widens "mine" past the caller', () => {
    const where = listWhere(
      {},
      { view: 'mine' },
      { now: new Date(), carrierUserId: null, includeSeller: true },
    );
    expect(where.AND).toContainEqual(
      expect.objectContaining({ ownerId: null }),
    );
  });
});
