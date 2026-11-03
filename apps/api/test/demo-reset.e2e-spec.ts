import { execSync } from 'node:child_process';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import request from 'supertest';
import {
  DEMO_CARRIER,
  DEMO_PASSWORD,
  DEMO_SELLERS,
} from '../src/modules/simulator/demo-dataset';
import { LAST_RESET_KEY } from '../src/modules/simulator/demo-reset.service';
import { DEMO_QUEUE } from '../src/modules/simulator/simulator.constants';
import {
  connectSocket,
  createShipment,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';
import { truncateAllTables } from './support/e2e-database';

// AppModule decides whether to load the simulator when it is imported, before any hook runs.
vi.hoisted(() => {
  process.env.DEMO_SIMULATOR = 'true';
});

describe('Demo reset (e2e)', () => {
  let ctx: E2eContext;
  let redis: Redis;
  let adminToken: string;
  let demoSellerToken: string;

  const http = () => request(ctx.app.getHttpServer());
  const login = async (email: string, password: string) => {
    const res = await http()
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    return res.body.accessToken as string;
  };
  const resetAs = (token: string) =>
    http().post('/admin/demo/reset').auth(token, { type: 'bearer' });
  const demoSellerIds = async () =>
    (
      await ctx.prisma.seller.findMany({
        where: { user: { email: { in: DEMO_SELLERS.map((s) => s.email) } } },
        select: { id: true },
      })
    ).map((seller) => seller.id);

  beforeAll(async () => {
    execSync('pnpm exec prisma db seed', {
      env: { ...process.env, SEED_DEMO: 'true' },
      stdio: 'ignore',
    });
    // A fresh mark keeps the startup catch-up reset from racing the assertions.
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    await redis.set(LAST_RESET_KEY, Date.now());

    ctx = await startApp();
    adminToken = await login(
      process.env.ADMIN_EMAIL ?? 'admin@minitms.dev',
      process.env.ADMIN_PASSWORD ?? 'admin12345',
    );
    demoSellerToken = await login(DEMO_SELLERS[0].email, DEMO_PASSWORD);
  });

  afterAll(async () => {
    await ctx.app.get<Queue>(getQueueToken(DEMO_QUEUE)).obliterate({
      force: true,
    });
    await ctx.app.close();
    await redis.del(LAST_RESET_KEY);
    redis.disconnect();
    delete process.env.DEMO_SIMULATOR;
    // The demo carrier covers all of SP; later specs must not see it.
    await truncateAllTables(process.env);
  });

  it('restores the demo shipments and leaves every other tenant alone', async () => {
    const demoCarrier = await ctx.prisma.carrier.findUniqueOrThrow({
      where: { document: DEMO_CARRIER.document },
    });
    const modality = await ctx.prisma.deliveryModality.findUniqueOrThrow({
      where: { code: 'STANDARD' },
    });
    const visitorShipment = await createShipment(ctx, demoSellerToken, {
      carrierId: demoCarrier.id,
      modalityId: modality.id,
    });
    const tenants = await createTenants(ctx);
    const otherShipment = await createShipment(ctx, tenants.sellerA, tenants);

    await resetAs(adminToken).expect(204);

    const demoShipments = await ctx.prisma.shipment.findMany({
      where: { sellerId: { in: await demoSellerIds() } },
      select: { trackingCode: true },
    });
    expect(demoShipments).toHaveLength(40);
    expect(
      demoShipments.every(({ trackingCode }) =>
        trackingCode.startsWith('TMS-DE'),
      ),
    ).toBe(true);
    await expect(
      ctx.prisma.shipment.findUnique({ where: { id: visitorShipment.id } }),
    ).resolves.toBeNull();
    await expect(
      ctx.prisma.shipment.findUnique({ where: { id: otherShipment.id } }),
    ).resolves.not.toBeNull();
  });

  it('lets only the admin trigger a reset', async () => {
    await resetAs(demoSellerToken).expect(403);
  });

  it('tells connected clients that the demo was reset', async () => {
    const socket = await connectSocket(ctx, '/public');
    const notified = new Promise<void>((resolve) =>
      socket.once('demo:reset', () => resolve()),
    );

    await resetAs(adminToken).expect(204);

    await expect(notified).resolves.toBeUndefined();
    socket.close();
  });
});
