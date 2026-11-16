import { execSync } from 'node:child_process';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import request from 'supertest';
import {
  CHAOS_COOLDOWN_KEY,
  CHAOS_KEY,
} from '../src/modules/simulator/chaos.service';
import { CHAOS_SCENARIOS } from '../src/modules/simulator/chaos-scenarios';
import {
  DEMO_PASSWORD,
  DEMO_SELLERS,
} from '../src/modules/simulator/demo-dataset';
import { LAST_RESET_KEY } from '../src/modules/simulator/demo-reset.service';
import { DEMO_QUEUE } from '../src/modules/simulator/simulator.constants';
import { SimulatorService } from '../src/modules/simulator/simulator.service';
import {
  adminToken,
  connectSocket,
  createShipment,
  createTenants,
  type E2eContext,
  randomIp,
  startApp,
} from './support/e2e-app';
import { truncateAllTables } from './support/e2e-database';

// AppModule decides whether to load the simulator when it is imported, before any hook runs.
vi.hoisted(() => {
  process.env.DEMO_SIMULATOR = 'true';
});

const TICKS_PER_SCENARIO = 2;

describe('Chaos scenarios (e2e)', () => {
  let ctx: E2eContext;
  let redis: Redis;
  let admin: string;
  let demoSeller: string;
  let tenants: Awaited<ReturnType<typeof createTenants>>;

  const bearer = { type: 'bearer' } as const;
  const http = () => request(ctx.app.getHttpServer());
  const inboxFailing = async (token: string) =>
    (await http().get('/webhooks/inbox').auth(token, bearer).expect(200)).body
      .failRequests as boolean;

  const setFailing = (token: string, failRequests: boolean) =>
    http()
      .patch('/webhooks/inbox')
      .auth(token, bearer)
      .send({ failRequests })
      .expect(200);
  const runWebhookDown = async (whileRunning: () => Promise<void>) => {
    await http()
      .post('/admin/demo/chaos')
      .auth(admin, bearer)
      .send({ scenario: 'webhook-down' })
      .expect(201);
    await whileRunning();
    await http().delete('/admin/demo/chaos').auth(admin, bearer).expect(204);
    await redis.del(CHAOS_COOLDOWN_KEY);
  };

  // Everything a scenario could touch on the other tenant, as stored.
  const otherTenantSnapshot = async () => {
    const seller = await ctx.prisma.seller.findFirstOrThrow({
      where: { user: { email: { notIn: DEMO_SELLERS.map((s) => s.email) } } },
      orderBy: { createdAt: 'asc' },
      include: {
        webhookEndpoint: true,
        shipments: {
          include: { trackingEvents: true },
          orderBy: { id: 'asc' },
        },
      },
    });
    return { seller, inboxFailing: await inboxFailing(tenants.sellerA) };
  };

  beforeAll(async () => {
    execSync('pnpm exec prisma db seed', {
      env: { ...process.env, SEED_DEMO: 'true' },
      stdio: 'ignore',
    });
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    // A fresh mark keeps the startup catch-up reset from racing the assertions.
    await redis.set(LAST_RESET_KEY, Date.now());
    await redis.del(CHAOS_KEY, CHAOS_COOLDOWN_KEY);
    ctx = await startApp();
    admin = await adminToken(ctx);
    tenants = await createTenants(ctx);
    demoSeller = (
      await http()
        .post('/auth/login')
        .send({ email: DEMO_SELLERS[0].email, password: DEMO_PASSWORD })
        .expect(201)
    ).body.accessToken;

    // One pending and one out-for-delivery shipment, so storm and outage both have a target.
    await createShipment(ctx, tenants.sellerA, tenants);
    const moving = await createShipment(ctx, tenants.sellerA, tenants);
    await http()
      .patch(`/shipments/${moving.id}/claim`)
      .auth(tenants.operator, bearer)
      .expect(200);
    for (const status of ['COLLECTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']) {
      await http()
        .patch(`/shipments/${moving.id}/status`)
        .auth(tenants.operator, bearer)
        .send({ status })
        .expect(200);
    }
    // Its own switch on: no scenario may turn it off.
    await setFailing(tenants.sellerA, true);
  }, 60_000);

  afterAll(async () => {
    await ctx.app.get<Queue>(getQueueToken(DEMO_QUEUE)).obliterate({
      force: true,
    });
    await ctx.app.close();
    await redis.del(LAST_RESET_KEY, CHAOS_KEY, CHAOS_COOLDOWN_KEY);
    redis.disconnect();
    delete process.env.DEMO_SIMULATOR;
    // The demo carrier covers all of SP; later specs must not see it.
    await truncateAllTables(process.env);
  });

  it('answers 500 from the demo inboxes only while webhook-down runs', async () => {
    const inboxId = (
      await http().get('/webhooks/endpoint').auth(demoSeller, bearer)
    ).body.url
      .split('/')
      .at(-1);
    const deliver = () =>
      http()
        .post(`/webhook-inbox/${inboxId}`)
        .set('X-Forwarded-For', randomIp())
        .send({});

    await runWebhookDown(async () => {
      await deliver().expect(500);
      // The scenario never writes the seller's own switch.
      expect(await inboxFailing(demoSeller)).toBe(false);
    });

    await deliver().expect(200);
  });

  it("keeps a demo seller's own Fail requests switch through webhook-down", async () => {
    await setFailing(demoSeller, true);

    await runWebhookDown(async () => {});

    expect(await inboxFailing(demoSeller)).toBe(true);
    await setFailing(demoSeller, false);
  });

  it('leaves a non-demo tenant untouched through every scenario', async () => {
    const socket = await connectSocket(ctx, '/', { token: tenants.sellerA });
    const simulator = ctx.app.get(SimulatorService);
    const before = await otherTenantSnapshot();

    for (const { id } of CHAOS_SCENARIOS) {
      await http()
        .post('/admin/demo/chaos')
        .auth(admin, bearer)
        .send({ scenario: id })
        .expect(201);
      for (let i = 0; i < TICKS_PER_SCENARIO; i++) {
        await simulator.tick();
        await simulator.drive();
      }
      await http().delete('/admin/demo/chaos').auth(admin, bearer).expect(204);
      await redis.del(CHAOS_COOLDOWN_KEY);
    }

    expect(await otherTenantSnapshot()).toEqual(before);
    expect(before.inboxFailing).toBe(true);
    socket.close();
  }, 60_000);
});
