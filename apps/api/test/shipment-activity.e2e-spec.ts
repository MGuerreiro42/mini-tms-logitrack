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

  const activityAs = (token: string) =>
    request(ctx.app.getHttpServer())
      .get('/shipments/activity')
      .auth(token, { type: 'bearer' });

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

  it('is reserved to sellers', async () => {
    await activityAs(tenants.operator).expect(403);
  });
});
