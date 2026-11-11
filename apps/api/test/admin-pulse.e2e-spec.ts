import request from 'supertest';
import { RedisHealthIndicator } from '../src/modules/health/redis.health';
import {
  adminToken,
  connectSocket,
  createShipment,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

describe('Admin pulse (e2e)', () => {
  let ctx: E2eContext;
  let admin: string;
  let tenants: Awaited<ReturnType<typeof createTenants>>;

  const pulse = (token: string) =>
    request(ctx.app.getHttpServer())
      .get('/admin/pulse')
      .auth(token, { type: 'bearer' });

  beforeAll(async () => {
    ctx = await startApp();
    admin = await adminToken(ctx);
    tenants = await createTenants(ctx);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await ctx.app.close();
  });

  it('reports events, sockets, webhooks, queues and services', async () => {
    const seller = (
      await request(ctx.app.getHttpServer())
        .get('/sellers/me')
        .auth(tenants.sellerA, { type: 'bearer' })
    ).body;
    // Before the shipment, whose webhook dispatch would create the seller's endpoint itself.
    const endpoint = await ctx.prisma.webhookEndpoint.create({
      data: {
        sellerId: seller.id,
        url: 'https://example.test/hook',
        events: [],
        secret: 'e2e',
      },
    });
    await ctx.prisma.webhookDelivery.createMany({
      data: [
        { status: 'SUCCEEDED', durationMs: 80 },
        { status: 'FAILED', durationMs: 900 },
      ].map((delivery) => ({
        ...delivery,
        endpointId: endpoint.id,
        event: 'SHIPMENT_CREATED' as const,
        payload: {},
      })),
    });
    await createShipment(ctx, tenants.sellerA, tenants);
    const socket = await connectSocket(ctx, '/public');

    const { body } = await pulse(admin).expect(200);
    socket.close();

    expect(body.eventsPerMinute).toHaveLength(15);
    expect(body.eventsPerMinute.at(-1)).toBeGreaterThanOrEqual(1);
    expect(body.sockets.public).toBeGreaterThanOrEqual(1);
    // Other suites may have delivered webhooks within the hour: at least these two.
    expect(body.webhooks.n).toBeGreaterThanOrEqual(2);
    expect(body.webhooks.successRate).toBeGreaterThan(0);
    expect(body.webhooks.successRate).toBeLessThan(100);
    expect(body.webhooks.p95Ms).toEqual(expect.any(Number));
    expect(body.queues).toContainEqual(
      expect.objectContaining({ name: 'webhooks' }),
    );
    expect(body.services).toEqual({ database: true, redis: true });
    // The suite's .env decides whether the simulator module is loaded.
    if (process.env.DEMO_SIMULATOR === 'true') {
      expect(['running', 'idle']).toContain(body.simulator);
      expect(body.queues.map((queue: { name: string }) => queue.name)).toEqual([
        'webhooks',
        'demo',
      ]);
    } else {
      expect(body.simulator).toBe('off');
      expect(body.queues).toHaveLength(1);
    }
  });

  it('answers 200 with redis false when its indicator fails', async () => {
    vi.spyOn(ctx.app.get(RedisHealthIndicator), 'pingCheck').mockRejectedValue(
      new Error('Connection is closed.'),
    );

    const { body } = await pulse(admin).expect(200);

    expect(body.services).toEqual({ database: true, redis: false });
    expect(body.eventsPerMinute).toHaveLength(15);
  });

  it('refuses every role but admin', async () => {
    await pulse(tenants.sellerA).expect(403);
    await pulse(tenants.manager).expect(403);
    await pulse(tenants.operator).expect(403);
  });
});
