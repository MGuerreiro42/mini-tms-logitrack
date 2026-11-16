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

describe('List views and search (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;
  let admin: string;
  const codes: Record<string, string> = {};

  const get = (token: string, path: string, query: object = {}) =>
    request(ctx.app.getHttpServer())
      .get(path)
      .query(query)
      .auth(token, { type: 'bearer' });
  const codesOf = ({ body }: { body: { data: { trackingCode: string }[] } }) =>
    body.data.map((s) => s.trackingCode);
  const totalOf = async (token: string, path: string, query: object) =>
    (await get(token, path, query).expect(200)).body.meta.total;
  const seed = async (
    name: string,
    data: Prisma.ShipmentUpdateInput,
    seller = tenants.sellerA,
  ) => {
    const { id, trackingCode } = await createShipment(ctx, seller, tenants);
    await ctx.prisma.shipment.update({ where: { id }, data });
    codes[name] = trackingCode;
    return id;
  };

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
    admin = await adminToken(ctx);

    await seed('soon', { dueAt: inHours(2) });
    await seed('later', {
      dueAt: inHours(10),
      addressCity: 'Campinas',
      addressZipCode: '13070178',
    });
    await seed('undated', { dueAt: null });
    await seed('failed', { status: 'FAILED_DELIVERY' });
    await seed('delivered', { status: 'DELIVERED' });
    await seed('road', { status: 'IN_TRANSIT' });
    await seed('other', { addressCity: 'Campinas' }, tenants.sellerB);
    const claimed = await seed('claimed', {});
    await request(ctx.app.getHttpServer())
      .patch(`/shipments/${claimed}/claim`)
      .auth(tenants.operator, { type: 'bearer' })
      .expect(200);
    await ctx.prisma.shipment.update({
      where: { id: claimed },
      data: { dueAt: inHours(-5) },
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it.each([
    ['seller', '/shipments', { active: 5, exceptions: 2, done: 1 }],
    [
      'carrier',
      '/shipments/queue',
      {
        mine: 1,
        unclaimed: 4,
        to_pick_up: 1,
        on_the_road: 1,
        exceptions: 2,
        done: 1,
      },
    ],
    ['admin', '/admin/shipments', { active: 6, exceptions: 2, done: 1 }],
  ])(
    'gives the %s list a count per view equal to its total',
    async (role, path, expected) => {
      const token = {
        seller: tenants.sellerA,
        carrier: tenants.operator,
        admin,
      }[role] as string;
      const scope = role === 'admin' ? { carrierId: tenants.carrierId } : {};

      const counts = await get(token, `${path}/view-counts`, scope).expect(200);

      expect(counts.body).toEqual(expected);
      for (const [view, count] of Object.entries(expected)) {
        await expect(totalOf(token, path, { ...scope, view })).resolves.toBe(
          count,
        );
      }
    },
  );

  it('orders an open view by due time, undated last', async () => {
    const res = await get(tenants.manager, '/shipments/queue', {
      view: 'unclaimed',
    }).expect(200);

    expect(codesOf(res)).toEqual([
      codes.soon,
      codes.later,
      codes.other,
      codes.undated,
    ]);
  });

  it.each([
    ['a lower-case code', () => codes.soon.toLowerCase(), ['soon']],
    ['a city', () => 'campinas', ['later']],
    ['a formatted zip prefix', () => '13070-1', ['later']],
    ['a literal %', () => '%', []],
    ['a literal _', () => '_', []],
  ])(
    'searches seller shipments by %s, never another seller’s',
    async (_, q, names) => {
      const res = await get(tenants.sellerA, '/shipments', { q: q() });

      expect(codesOf(res)).toEqual(names.map((name) => codes[name]));
    },
  );

  it('searches the seller name on the queue only', async () => {
    await expect(
      totalOf(tenants.manager, '/shipments/queue', { q: 'e2e sell' }),
    ).resolves.toBe(8);
    await expect(
      totalOf(tenants.sellerA, '/shipments', { q: 'e2e sell' }),
    ).resolves.toBe(0);
    await expect(
      totalOf(tenants.manager, '/shipments/queue', {
        q: 'Campinas',
        view: 'unclaimed',
      }),
    ).resolves.toBe(2);
  });

  it('rejects a view of another role, an unknown view and a long search', async () => {
    await get(tenants.sellerA, '/shipments', { view: 'mine' }).expect(400);
    await get(admin, '/admin/shipments', { view: 'bogus' }).expect(400);
    await get(tenants.operator, '/shipments/queue', {
      q: 'x'.repeat(101),
    }).expect(400);
    await expect(
      totalOf(tenants.sellerA, '/shipments', { q: '   ' }),
    ).resolves.toBe(7);
  });
});
