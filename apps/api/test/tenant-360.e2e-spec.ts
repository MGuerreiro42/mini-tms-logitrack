import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Prisma } from '../generated/prisma/client';
import {
  adminToken,
  createShipment,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

const HOUR_MS = 3_600_000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR_MS);

describe('Tenant 360 (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;
  let admin: string;
  let sellerId: string;

  const get = (token: string, path: string, query: object = {}) =>
    request(ctx.app.getHttpServer())
      .get(path)
      .query(query)
      .auth(token, { type: 'bearer' });
  const seed = async (data: Prisma.ShipmentUpdateInput) => {
    const { id } = await createShipment(ctx, tenants.sellerA, tenants);
    await ctx.prisma.shipment.update({ where: { id }, data });
  };
  const delivered = (createdHoursAgo: number, lateByHours: number) => {
    const dueAt = inHours(-createdHoursAgo + 24);
    return {
      status: 'DELIVERED' as const,
      createdAt: inHours(-createdHoursAgo),
      dueAt,
      deliveredAt: new Date(dueAt.getTime() + lateByHours * HOUR_MS),
    };
  };

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
    admin = await adminToken(ctx);
    sellerId = (await get(tenants.sellerA, '/sellers/me').expect(200)).body.id;

    await seed({ dueAt: inHours(-3) }); // late now
    await seed({ status: 'IN_TRANSIT', dueAt: inHours(5) });
    await seed(delivered(48, -1));
    await seed(delivered(10 * 24, 2));
    await seed(delivered(60 * 24, -1));
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it.each(['7d', '30d', '90d'])(
    'gives the Seller 360 at %s the numbers the seller sees',
    async (window) => {
      const [admin360, mine, views, attention, list] = await Promise.all([
        get(admin, '/admin/metrics', { sellerId, window }).expect(200),
        get(tenants.sellerA, '/shipments/metrics', { window }).expect(200),
        get(tenants.sellerA, '/shipments/view-counts').expect(200),
        get(tenants.sellerA, '/shipments/attention').expect(200),
        get(admin, '/admin/shipments', { sellerId, window }).expect(200),
      ]);

      expect(admin360.body.onTime).toEqual(mine.body.onTime);
      expect(admin360.body.active).toBe(views.body.active);
      expect(admin360.body.lateNow).toBe(views.body.late);
      expect(admin360.body.lateNow).toBe(attention.body.counts.late);
      expect(admin360.body.shipments).toBe(list.body.meta.total);
    },
  );

  it('lists the seller modalities to the admin only', async () => {
    const { body } = await get(admin, `/sellers/${sellerId}/modalities`).expect(
      200,
    );
    const mine = await get(tenants.sellerA, '/sellers/me/modalities').expect(
      200,
    );

    expect(body).toEqual(mine.body);
    expect(body).toContainEqual(
      expect.objectContaining({ code: 'STANDARD', enabled: true }),
    );
    await get(tenants.sellerA, `/sellers/${sellerId}/modalities`).expect(403);
    await get(tenants.manager, `/sellers/${sellerId}/modalities`).expect(403);
    await get(admin, `/sellers/${randomUUID()}/modalities`).expect(404);
    await get(admin, '/sellers/not-a-uuid/modalities').expect(400);
  });
});
