import request from 'supertest';
import {
  createShipment,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

const HOUR_MS = 3_600_000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR_MS);

describe('Seller metrics (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;

  const get = (token: string, path: string, query: object = {}) =>
    request(ctx.app.getHttpServer())
      .get(path)
      .query(query)
      .auth(token, { type: 'bearer' });
  const deliver = async (
    seller: string,
    createdHoursAgo: number,
    lateByHours: number,
  ) => {
    const { id } = await createShipment(ctx, seller, tenants);
    const createdAt = inHours(-createdHoursAgo);
    const dueAt = inHours(-createdHoursAgo + 24);
    await ctx.prisma.shipment.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        createdAt,
        dueAt,
        deliveredAt: new Date(dueAt.getTime() + lateByHours * HOUR_MS),
      },
    });
  };

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
    await deliver(tenants.sellerA, 48, -2); // recent, on time
    await deliver(tenants.sellerA, 30, 3); // recent, late
    await deliver(tenants.sellerA, 40 * 24, -1); // 40 days ago, on time
    await deliver(tenants.sellerB, 48, 5); // another tenant, late
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it.each([
    ['7d', 2, { n: 2, count: 1, rate: 50 }],
    ['30d', 2, { n: 2, count: 1, rate: 50 }],
    ['90d', 3, { n: 3, count: 2 }],
  ])(
    'counts only the seller’s own shipments created in the last %s',
    async (window, delivered, onTime) => {
      const { body } = await get(tenants.sellerA, '/shipments/metrics', {
        window,
      }).expect(200);
      const list = await get(tenants.sellerA, '/shipments', {
        status: 'DELIVERED',
        window,
      }).expect(200);

      expect(body.delivered).toBe(delivered);
      expect(list.body.meta.total).toBe(delivered);
      expect(body.onTime).toMatchObject(onTime);
      expect(body.byModality).toEqual([
        expect.objectContaining({ modalityCode: 'STANDARD', ...onTime }),
      ]);
    },
  );

  it('refuses a seller still under review', async () => {
    const email = `pending-${Date.now()}@e2e.test`;
    const token = await tenants.sellerToken(email);
    await ctx.prisma.seller.updateMany({
      where: { user: { email } },
      data: { status: 'PENDING' },
    });

    await get(token, '/shipments/metrics').expect(403);
  });
});
