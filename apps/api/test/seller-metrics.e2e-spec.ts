import { execSync } from 'node:child_process';
import request from 'supertest';
import {
  DEMO_PASSWORD,
  DEMO_SELLERS,
} from '../src/modules/simulator/demo-dataset';
import {
  createShipment,
  createTenants,
  type E2eContext,
  randomIp,
  startApp,
} from './support/e2e-app';
import { truncateAllTables } from './support/e2e-database';

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
    // The demo carriers cover all of SP; later specs must not see them.
    await truncateAllTables(process.env);
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

  it('compares with the previous window of the same span', async () => {
    const { body } = await get(tenants.sellerA, '/shipments/metrics', {
      window: '30d',
    }).expect(200);
    const { since, previousSince } = body.comparison;

    expect(Date.parse(since) - Date.parse(previousSince)).toBe(
      30 * 24 * HOUR_MS,
    );
    expect(body.comparison).toMatchObject({
      mature: true,
      onTime: { n: 1, count: 1, rate: 100 },
      firstAttempt: { n: 1, count: 1, rate: 100 },
    });
  });

  it('reads the reference numbers of spec 10 on the seeded demo seller', async () => {
    execSync('pnpm exec prisma db seed', {
      env: { ...process.env, SEED_DEMO: 'true' },
      stdio: 'ignore',
    });
    const login = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', randomIp())
      .send({ email: DEMO_SELLERS[0].email, password: DEMO_PASSWORD })
      .expect(201);
    const token = login.body.accessToken;

    const { body } = await get(token, '/shipments/metrics', {
      window: '90d',
    }).expect(200);
    const list = await get(token, '/shipments', {
      status: 'DELIVERED',
      window: '90d',
    }).expect(200);

    expect(body).toMatchObject({
      shipments: 180,
      delivered: 150,
      cancelled: 5,
      onTime: { n: 150, count: 137 },
      firstAttempt: { n: 159, failed: 9, returned: 6 },
      slaMedianHours: 72,
      comparison: { onTime: { n: 0 } },
    });
    expect(list.body.meta.total).toBe(150);
    expect(body.byState).toContainEqual(
      expect.objectContaining({ uf: 'PR', n: 9, count: 7 }),
    );
    expect(body.volume.bucket).toBe('week');
    expect(
      body.volume.points.map(
        (p: { delivered: number; problem: number; open: number }) =>
          p.delivered + p.problem + p.open,
      ),
    ).toEqual([11, 12, 12, 13, 12, 13, 13, 14, 14, 14, 16, 15, 16]);
    // The seed script starts its own Prisma client and hashes the demo passwords.
  }, 20_000);

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
