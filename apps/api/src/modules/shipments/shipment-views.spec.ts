import { listWhere, searchWhere, viewWhere } from './shipment-views';

const dueAt = { name: 'dueAt' } as never;
const now = new Date('2026-01-31T12:00:00Z');
const ctx = { now, carrierUserId: null, includeSeller: false, dueAt };

describe('shipment views', () => {
  it.each(['01', 'TMS-DE123'])('does not read %s as a zip prefix', (q) => {
    const parts = searchWhere(q, { includeSeller: false }).OR ?? [];
    expect(parts.some((part) => 'addressZipCode' in part)).toBe(false);
  });

  it('adds the window as a createdAt lower bound', () => {
    expect(listWhere({ sellerId: 's' }, { window: '30d' }, ctx)).toEqual({
      AND: [
        {
          sellerId: 's',
          createdAt: { gte: new Date('2026-01-01T12:00:00Z') },
        },
      ],
    });
  });

  it('refuses "mine" without a carrier user', () => {
    expect(() =>
      listWhere({}, { view: 'mine' }, { ...ctx, includeSeller: true }),
    ).toThrow();
  });

  it('narrows by UF, modality and the on-time outcome of a delivery', () => {
    expect(
      listWhere({}, { uf: 'PR', modality: 'FULL', sla: 'late' }, ctx).AND,
    ).toEqual([
      {},
      { addressState: 'PR' },
      { modality: { code: 'FULL' } },
      { status: 'DELIVERED', deliveredAt: { gt: dueAt } },
    ]);
    expect(listWhere({}, { sla: 'on-time' }, ctx).AND).toContainEqual({
      status: 'DELIVERED',
      deliveredAt: { lte: dueAt },
    });
  });

  it('counts a pending shipment as waiting after 2 hours, until it is late', () => {
    expect(viewWhere('waiting', ctx)).toEqual({
      status: 'PENDING',
      ownerId: null,
      createdAt: { lt: new Date('2026-01-31T10:00:00Z') },
      OR: [{ dueAt: null }, { dueAt: { gte: now } }],
    });
  });

  it('counts failed, late and waiting shipments as exceptions', () => {
    expect(viewWhere('exceptions', ctx)).toEqual({
      OR: [
        { status: 'FAILED_DELIVERY' },
        viewWhere('late', ctx),
        viewWhere('waiting', ctx),
      ],
    });
  });

  it('reads an SLA-state view from the ids resolved for it', () => {
    expect(viewWhere('due-soon', { ...ctx, slaStateIds: ['a'] })).toEqual({
      id: { in: ['a'] },
    });
    expect(() => viewWhere('on-track', ctx)).toThrow();
  });
});
