import request from 'supertest';
import type { Prisma } from '../generated/prisma/client';
import {
  createShipment,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

const HOUR_MS = 3_600_000;
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR_MS);

describe('Seller list filters (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;

  const list = (token: string, query: object) =>
    request(ctx.app.getHttpServer())
      .get('/shipments')
      .query({ limit: 100, ...query })
      .auth(token, { type: 'bearer' });
  const total = async (query: object) =>
    (await list(tenants.sellerA, query).expect(200)).body.meta.total;
  const ids = async (token: string, query: object): Promise<string[]> =>
    (await list(token, query).expect(200)).body.data.map(
      (s: { id: string }) => s.id,
    );
  // A shipment created hoursAgo with an SLA of slaHours, then moved as data says.
  const shipment = async (
    token: string,
    hoursAgo: number,
    slaHours: number,
    data: Prisma.ShipmentUpdateInput = {},
  ) => {
    const { id } = await createShipment(ctx, token, tenants);
    await ctx.prisma.shipment.update({
      where: { id },
      data: {
        createdAt: hoursFromNow(-hoursAgo),
        dueAt: hoursFromNow(slaHours - hoursAgo),
        ...data,
      },
    });
    return id;
  };
  const delivered = (lateByHours: number, addressState = 'SP') => ({
    status: 'DELIVERED' as const,
    addressState,
    deliveredAt: hoursFromNow(lateByHours - 24),
  });

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
    const { sellerA } = tenants;
    // Created 72 h ago on a 48 h SLA: due 24 h ago, so delivered() is late relative to that.
    await shipment(sellerA, 72, 48, delivered(-2, 'PR'));
    await shipment(sellerA, 72, 48, delivered(3, 'PR'));
    await shipment(sellerA, 72, 48, delivered(1));
    await shipment(sellerA, 72, 48, { status: 'FAILED_DELIVERY' });
    await shipment(sellerA, 3, 24); // waiting for a carrier, on track
    await shipment(sellerA, 1, 24); // pending, not waiting yet
    await shipment(sellerA, 20, 24, { status: 'IN_TRANSIT' }); // due soon
    await shipment(sellerA, 30, 24, { status: 'IN_TRANSIT' }); // late
    await shipment(sellerA, 2, 72, { status: 'ACCEPTED' }); // on track
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('opens each Overview count as a list of the same size', async () => {
    const { body: metrics } = await request(ctx.app.getHttpServer())
      .get('/shipments/metrics')
      .query({ window: '90d' })
      .auth(tenants.sellerA, { type: 'bearer' })
      .expect(200);
    const pr = metrics.byState.find((row: { uf: string }) => row.uf === 'PR');
    const window = '90d';

    expect(await total({ status: 'DELIVERED', window, uf: 'PR' })).toBe(pr.n);
    expect(
      await total({ status: 'DELIVERED', window, modality: 'STANDARD' }),
    ).toBe(metrics.byModality[0].n);
    expect(await total({ status: 'DELIVERED', window, sla: 'late' })).toBe(
      metrics.onTime.n - metrics.onTime.count,
    );
    expect(await total({ status: 'DELIVERED', window, sla: 'on-time' })).toBe(
      metrics.onTime.count,
    );
    expect(await total({ view: 'on-track' })).toBe(3);
    expect(await total({ view: 'due-soon' })).toBe(1);
    expect(await total({ view: 'late' })).toBe(1);
    expect(await total({ view: 'waiting' })).toBe(1);
    // Failed, late and waiting.
    expect(await total({ view: 'exceptions' })).toBe(3);
  });

  it('splits on track from due soon at the 6 h floor and at 25 % of the SLA', async () => {
    const { sellerB } = tenants;
    const soon24 = await shipment(sellerB, 18.1, 24);
    const track24 = await shipment(sellerB, 17.9, 24);
    const soon72 = await shipment(sellerB, 54.1, 72);
    const track72 = await shipment(sellerB, 53.9, 72);

    expect((await ids(sellerB, { view: 'due-soon' })).sort()).toEqual(
      [soon24, soon72].sort(),
    );
    expect((await ids(sellerB, { view: 'on-track' })).sort()).toEqual(
      [track24, track72].sort(),
    );
  });

  it.each([{ uf: 'XX' }, { sla: 'early' }, { view: 'soon' }])(
    'rejects %o',
    async (query) => {
      await list(tenants.sellerA, query).expect(400);
    },
  );

  it('keeps the list to sellers', async () => {
    await list(tenants.manager, { view: 'due-soon' }).expect(403);
  });
});
