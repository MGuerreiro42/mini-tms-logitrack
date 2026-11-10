import request from 'supertest';
import type { Prisma } from '../generated/prisma/client';
import {
  adminToken,
  createShipment,
  createTenants,
  type E2eContext,
  OPERATOR_NAME,
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
    await seed('delivered', {
      status: 'DELIVERED',
      createdAt: inHours(-40 * 24),
    });
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
    ['seller', '/shipments', { active: 5, late: 1, exceptions: 2, done: 1 }],
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
    [
      'admin',
      '/admin/shipments',
      { active: 6, late: 1, exceptions: 2, done: 1 },
    ],
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

  it('narrows the lists and their counts to the window by createdAt', async () => {
    const scope = { carrierId: tenants.carrierId };
    await expect(
      totalOf(tenants.sellerA, '/shipments', { window: '30d' }),
    ).resolves.toBe(6);
    await expect(
      totalOf(tenants.sellerA, '/shipments', { window: '90d' }),
    ).resolves.toBe(7);
    await expect(
      totalOf(admin, '/admin/shipments', { ...scope, window: '30d' }),
    ).resolves.toBe(7);

    const views = await get(tenants.sellerA, '/shipments/view-counts', {
      window: '30d',
    }).expect(200);
    const statuses = await get(tenants.sellerA, '/shipments/status-counts', {
      window: '30d',
    }).expect(200);
    const adminStatuses = await get(admin, '/admin/shipments/status-counts', {
      ...scope,
      window: '90d',
    }).expect(200);

    const attention = await get(tenants.sellerA, '/shipments/attention', {
      window: '30d',
    }).expect(200);

    expect(views.body).toMatchObject({ active: 5, done: 0 });
    expect(attention.body.counts.late).toBe(views.body.late);
    expect(statuses.body.DELIVERED).toBe(0);
    expect(adminStatuses.body.DELIVERED).toBe(1);
  });

  it.each(['7d', '30d', '90d'])(
    'gives the %s seller metrics the totals of the lists their tiles open',
    async (window) => {
      const metrics = await get(tenants.sellerA, '/shipments/metrics', {
        window,
      }).expect(200);

      await expect(
        totalOf(tenants.sellerA, '/shipments', {
          status: 'DELIVERED',
          window,
        }),
      ).resolves.toBe(metrics.body.delivered);
      expect(metrics.body.onTime.trend).toHaveLength(12);
    },
  );

  it.each(['7d', '30d', '90d'])(
    'gives the %s admin metrics the numbers of the carrier and the lists',
    async (window) => {
      const scope = { carrierId: tenants.carrierId };
      const [platform, carrier, performance] = await Promise.all([
        get(admin, '/admin/metrics', { window }).expect(200),
        get(admin, '/admin/metrics', { ...scope, window }).expect(200),
        get(tenants.manager, '/carriers/me/performance', { window }).expect(
          200,
        ),
      ]);
      const row = platform.body.byCarrier.find(
        (c: { carrierId: string }) => c.carrierId === tenants.carrierId,
      );

      expect(carrier.body.onTime).toEqual(performance.body.onTime);
      expect(row).toMatchObject({
        n: performance.body.onTime.n,
        rate: performance.body.onTime.rate,
      });
      expect(carrier.body.byCarrier).toEqual([]);
      await expect(
        totalOf(admin, '/admin/shipments', { ...scope, view: 'late' }),
      ).resolves.toBe(carrier.body.lateNow);
      await expect(
        totalOf(admin, '/admin/shipments', { ...scope, view: 'active' }),
      ).resolves.toBe(carrier.body.active);
    },
  );

  it('keeps the admin metrics to admins', async () => {
    await get(tenants.sellerA, '/admin/metrics').expect(403);
    await get(tenants.manager, '/admin/metrics').expect(403);
  });

  it.each([
    ['seller', '/shipments'],
    ['seller', '/shipments/view-counts'],
    ['admin', '/admin/metrics'],
    ['seller', '/shipments/metrics'],
    ['seller', '/shipments/status-counts'],
    ['seller', '/shipments/sla-summary'],
    ['admin', '/admin/shipments'],
    ['admin', '/admin/shipments/view-counts'],
    ['admin', '/admin/shipments/status-counts'],
    ['carrier', '/carriers/me/performance'],
  ])('rejects an unknown window on the %s %s', async (role, path) => {
    const token = { admin, seller: tenants.sellerA, carrier: tenants.manager }[
      role
    ] as string;
    await get(token, path, { window: '1d' }).expect(400);
  });

  it('lets window win over since on carrier performance', async () => {
    const since = inHours(-60 * 24).toISOString();
    const total = async (query: object) =>
      (
        await get(tenants.manager, '/carriers/me/performance', query).expect(
          200,
        )
      ).body.totalShipments;

    await expect(total({ since, window: '30d' })).resolves.toBe(
      (await total({ since })) - 1,
    );

    const { body } = await get(tenants.manager, '/carriers/me/performance', {
      window: '90d',
    }).expect(200);
    expect(
      body.stages.map((stage: { status: string }) => stage.status),
    ).toEqual([
      'PENDING',
      'ACCEPTED',
      'COLLECTED',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
    ]);
    expect(body.stages[0].budgetHours).toBeGreaterThan(0);

    const team = await get(tenants.operator, '/carriers/me/operator-ranking', {
      window: '90d',
    }).expect(200);
    expect(
      team.body.map((m: { role: string; claimed: number }) => [
        m.role,
        m.claimed,
      ]),
    ).toEqual([
      ['OPERATOR', 1],
      ['MANAGER', 0],
    ]);
    expect(team.body[0].name).toBe(OPERATOR_NAME);
  });
});
