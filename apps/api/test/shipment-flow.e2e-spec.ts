import request from 'supertest';
import {
  createShipment,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

describe('Shipment flow (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;

  const http = () => request(ctx.app.getHttpServer());
  const patch = (path: string, token: string, body: object = {}) =>
    http().patch(path).auth(token, { type: 'bearer' }).send(body);

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('lets a seller cancel, after which a claim is a 409', async () => {
    const shipment = await createShipment(ctx, tenants.sellerA, tenants);

    const cancel = await patch(
      `/shipments/${shipment.id}/cancel`,
      tenants.sellerA,
      { note: 'Customer gave up' },
    ).expect(200);
    expect(cancel.body.status).toBe('CANCELLED');

    await patch(`/shipments/${shipment.id}/claim`, tenants.operator).expect(
      409,
    );
  });

  it('lets exactly one of two concurrent claims win', async () => {
    const shipment = await createShipment(ctx, tenants.sellerA, tenants);

    const responses = await Promise.all([
      patch(`/shipments/${shipment.id}/claim`, tenants.operator),
      patch(`/shipments/${shipment.id}/claim`, tenants.manager),
    ]);

    expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
    const events = await ctx.prisma.trackingEvent.count({
      where: { shipmentId: shipment.id, status: 'ACCEPTED' },
    });
    expect(events).toBe(1);
  });

  it("returns 404 for another seller's shipment, read or cancel", async () => {
    const shipment = await createShipment(ctx, tenants.sellerB, tenants);

    await http()
      .get(`/shipments/${shipment.id}`)
      .auth(tenants.sellerA, { type: 'bearer' })
      .expect(404);
    await patch(`/shipments/${shipment.id}/cancel`, tenants.sellerA).expect(
      404,
    );
  });

  it('forbids a carrier from setting CANCELLED through the status endpoint', async () => {
    const shipment = await createShipment(ctx, tenants.sellerA, tenants);
    await patch(`/shipments/${shipment.id}/claim`, tenants.operator).expect(
      200,
    );

    await patch(`/shipments/${shipment.id}/status`, tenants.manager, {
      status: 'CANCELLED',
    }).expect(403);
  });
});
