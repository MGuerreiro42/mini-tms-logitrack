import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import request from 'supertest';
import {
  DEMO_CARRIER,
  DEMO_EXTRA_CARRIERS,
  DEMO_PASSWORD,
  DEMO_SELLERS,
  DEMO_SHIPMENT_COUNT,
  DEMO_TRACKING_PREFIX,
} from '../src/modules/simulator/demo-dataset';
import { LAST_RESET_KEY } from '../src/modules/simulator/demo-events';
import { DEMO_QUEUE } from '../src/modules/simulator/simulator.constants';
import {
  connectSocket,
  createShipment,
  createTenants,
  type E2eContext,
  adminToken as newAdminToken,
  startApp,
} from './support/e2e-app';
import { seedDemo, truncateAllTables } from './support/e2e-database';

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
    seedDemo();
    // A fresh mark keeps the startup catch-up reset from racing the assertions.
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    await redis.set(LAST_RESET_KEY, Date.now());

    ctx = await startApp();
    adminToken = await login(
      process.env.ADMIN_EMAIL ?? 'admin@minitms.dev',
      process.env.ADMIN_PASSWORD ?? 'admin12345',
    );
    demoSellerToken = await login(DEMO_SELLERS[0].email, DEMO_PASSWORD);
    // The seed child process alone takes ~6s on a freshly truncated database.
  }, 60_000);

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

    const startedAt = Date.now();
    await resetAs(adminToken).expect(204);
    expect(Date.now() - startedAt).toBeLessThan(5000);

    const demoShipments = await ctx.prisma.shipment.findMany({
      where: { sellerId: { in: await demoSellerIds() } },
      select: { trackingCode: true },
    });
    expect(demoShipments).toHaveLength(DEMO_SHIPMENT_COUNT);
    expect(
      demoShipments.every(({ trackingCode }) =>
        trackingCode.startsWith(DEMO_TRACKING_PREFIX),
      ),
    ).toBe(true);
    await expect(
      ctx.prisma.shipment.findUnique({ where: { id: visitorShipment.id } }),
    ).resolves.toBeNull();
    await expect(
      ctx.prisma.shipment.findUnique({ where: { id: otherShipment.id } }),
    ).resolves.not.toBeNull();
  });

  it('covers RJ, MG and PR with EconoLog once, however often the seed runs', async () => {
    seedDemo();

    const coverage = await ctx.prisma.carrierCoverageArea.findMany({
      where: { carrier: { document: DEMO_EXTRA_CARRIERS[1].document } },
      select: { state: true, city: true },
      orderBy: { state: 'asc' },
    });
    expect(coverage).toEqual(
      ['MG', 'PR', 'RJ', 'SP'].map((state) => ({ state, city: null })),
    );
  }, 20_000);

  it('replaces a legacy demo dataset with the current one on the first seed', async () => {
    const [seller] = await ctx.prisma.seller.findMany({
      where: { user: { email: DEMO_SELLERS[0].email } },
    });
    const carrier = await ctx.prisma.carrier.findUniqueOrThrow({
      where: { document: DEMO_CARRIER.document },
    });
    const modality = await ctx.prisma.deliveryModality.findUniqueOrThrow({
      where: { code: 'STANDARD' },
    });
    await ctx.prisma.shipment.createMany({
      data: ['LEGACY-1', 'LEGACY-2'].map((suffix) => ({
        trackingCode: `${DEMO_TRACKING_PREFIX}${suffix}`,
        sellerId: seller.id,
        carrierId: carrier.id,
        modalityId: modality.id,
        addressStreet: 'Rua Velha',
        addressNumber: '1',
        addressNeighborhood: 'Centro',
        addressCity: 'São Paulo',
        addressState: 'SP',
        addressZipCode: '01000000',
      })),
    });

    seedDemo();

    const codes = await ctx.prisma.shipment.findMany({
      where: { sellerId: { in: await demoSellerIds() } },
      select: { trackingCode: true },
    });
    expect(codes).toHaveLength(DEMO_SHIPMENT_COUNT);
    expect(
      codes.some(({ trackingCode }) => trackingCode.includes('LEGACY')),
    ).toBe(false);
  }, 20_000);

  it('leaves the same state as the daily reset when the seed runs on deploy', async () => {
    const [sellerId] = await demoSellerIds();
    const stale = { url: 'https://visitor.example/hook', secret: 'stale' };
    const endpoint = await ctx.prisma.webhookEndpoint.upsert({
      where: { sellerId },
      create: { sellerId, ...stale, events: [], active: false },
      update: { ...stale, active: false },
    });
    await ctx.prisma.apiKey.create({
      data: { sellerId, name: 'visitor', prefix: 'mt_x', hash: 'visitor-hash' },
    });
    await redis.set(LAST_RESET_KEY, 1);

    seedDemo();

    await expect(
      ctx.prisma.apiKey.count({ where: { sellerId } }),
    ).resolves.toBe(0);
    const reset = await ctx.prisma.webhookEndpoint.findUniqueOrThrow({
      where: { id: endpoint.id },
    });
    expect(reset).toMatchObject({ active: true });
    expect(reset.inboxId).not.toBe(endpoint.inboxId);
    expect(reset.secret).not.toBe(stale.secret);
    expect(reset.url).toContain(reset.inboxId);
    expect(Number(await redis.get(LAST_RESET_KEY))).toBeGreaterThan(
      Date.now() - 60_000,
    );
  }, 20_000);

  it('lets only the admin trigger a reset, once a minute per admin', async () => {
    await resetAs(demoSellerToken).expect(403);
    const admin = await newAdminToken(ctx);
    await resetAs(admin).expect(204);
    await resetAs(admin).expect(429);
  });

  it('tells connected clients that the demo was reset', async () => {
    const socket = await connectSocket(ctx, '/public');
    const notified = new Promise<void>((resolve) =>
      socket.once('demo:reset', () => resolve()),
    );

    await resetAs(await newAdminToken(ctx)).expect(204);

    await expect(notified).resolves.toBeUndefined();
    socket.close();
  });
});
