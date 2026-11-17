import request from 'supertest';
import {
  createShipment,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

describe('Shipment activity (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;

  const activityAs = (token: string, query: object = {}) =>
    request(ctx.app.getHttpServer())
      .get('/shipments/activity')
      .query(query)
      .auth(token, { type: 'bearer' });
  const hoursAgo = (hours: number) =>
    new Date(Date.now() - hours * 3_600_000).toISOString();

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it("returns the seller's own events, newest first, and nothing of other sellers", async () => {
    const shipment = await createShipment(ctx, tenants.sellerA, tenants);
    await request(ctx.app.getHttpServer())
      .patch(`/shipments/${shipment.id}/claim`)
      .auth(tenants.operator, { type: 'bearer' })
      .expect(200);

    const own = await activityAs(tenants.sellerA).expect(200);
    const others = await activityAs(tenants.sellerB).expect(200);

    expect(own.body.map((e: { status: string }) => e.status)).toEqual([
      'ACCEPTED',
      'PENDING',
    ]);
    expect(own.body[0]).toMatchObject({
      shipmentId: shipment.id,
      trackingCode: shipment.trackingCode,
      city: 'São Paulo',
    });
    expect(others.body).toEqual([]);
  });

  it('reads the events since a moment of the last 24 h, with each due time', async () => {
    const seller = await tenants.sellerToken();
    const shipment = await createShipment(ctx, seller, tenants);
    await ctx.prisma.trackingEvent.updateMany({
      where: { shipmentId: shipment.id },
      data: { createdAt: hoursAgo(5) },
    });
    const { dueAt } = await ctx.prisma.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
    });

    const recent = await activityAs(seller, { since: hoursAgo(4) });
    const wider = await activityAs(seller, { since: hoursAgo(6), limit: 200 });

    expect(recent.body).toEqual([]);
    expect(wider.body).toEqual([
      expect.objectContaining({
        shipmentId: shipment.id,
        dueAt: dueAt?.toISOString(),
      }),
    ]);
  });

  it.each([{ since: hoursAgo(25) }, { limit: 201 }])(
    'rejects %o',
    async (query) => {
      await activityAs(tenants.sellerA, query).expect(400);
    },
  );

  it('is reserved to sellers', async () => {
    await activityAs(tenants.operator).expect(403);
  });
});
