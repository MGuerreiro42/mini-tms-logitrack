import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { Socket } from 'socket.io-client';
import request from 'supertest';
import {
  CHAOS_COOLDOWN_KEY,
  CHAOS_KEY,
  CHAOS_RUNS_KEY,
  type ChaosState,
} from '../src/modules/simulator/chaos.service';
import { LAST_RESET_KEY } from '../src/modules/simulator/demo-reset.service';
import {
  CHAOS_END_JOB,
  DEMO_QUEUE,
} from '../src/modules/simulator/simulator.constants';
import {
  adminToken,
  connectSocket,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

// AppModule decides whether to load the simulator when it is imported, before any hook runs.
vi.hoisted(() => {
  process.env.DEMO_SIMULATOR = 'true';
});

const STORM = { scenario: 'failed-deliveries', durationSec: 60 };

describe('Demo chaos (e2e)', () => {
  let ctx: E2eContext;
  let redis: Redis;
  let admin: string;
  let seller: string;
  let socket: Socket;
  let chaosEvents: unknown[];

  const as = (token: string) => {
    const http = request(ctx.app.getHttpServer());
    const bearer = { type: 'bearer' } as const;
    return {
      get: (url: string) => http.get(url).auth(token, bearer),
      post: (url: string, body: object = {}) =>
        http.post(url).auth(token, bearer).send(body),
      delete: (url: string) => http.delete(url).auth(token, bearer),
    };
  };
  const overview = async () =>
    (await as(admin).get('/admin/demo').expect(200)).body;
  const storedRun = async () =>
    JSON.parse((await redis.get(CHAOS_KEY)) ?? 'null') as ChaosState;

  beforeAll(async () => {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    // A fresh mark keeps the startup catch-up reset from ending the runs under test.
    await redis.set(LAST_RESET_KEY, Date.now());
    ctx = await startApp();
    admin = await adminToken(ctx);
    seller = (await createTenants(ctx)).sellerA;
    socket = await connectSocket(ctx, '/', { token: seller });
    socket.on('demo:chaos', (payload) => chaosEvents.push(payload));
  });

  beforeEach(async () => {
    await redis.del(CHAOS_KEY, CHAOS_COOLDOWN_KEY, CHAOS_RUNS_KEY);
    chaosEvents = [];
  });

  afterAll(async () => {
    socket.close();
    await ctx.app.get<Queue>(getQueueToken(DEMO_QUEUE)).obliterate({
      force: true,
    });
    await ctx.app.close();
    await redis.del(
      LAST_RESET_KEY,
      CHAOS_KEY,
      CHAOS_COOLDOWN_KEY,
      CHAOS_RUNS_KEY,
    );
    redis.disconnect();
    delete process.env.DEMO_SIMULATOR;
  });

  it('tells any signed-in role that no scenario runs and when the next reset is', async () => {
    const { body } = await as(seller).get('/demo/status').expect(200);

    expect(body).toEqual({ chaos: null, nextResetAt: expect.any(String) });
  });

  it('starts one scenario for every client, refuses a second and ends it now', async () => {
    const { body: started } = await as(admin)
      .post('/admin/demo/chaos', STORM)
      .expect(201);
    expect(started).toMatchObject({
      scenario: 'failed-deliveries',
      label: 'Storm: failed deliveries',
      startedBy: expect.stringContaining('@'),
    });
    const status = {
      scenario: 'failed-deliveries',
      label: 'Storm: failed deliveries',
      description: expect.any(String),
      endsAt: started.endsAt,
    };
    await vi.waitFor(() => expect(chaosEvents).toEqual([status]));
    await expect(as(seller).get('/demo/status')).resolves.toMatchObject({
      body: { chaos: status },
    });

    const second = await as(admin)
      .post('/admin/demo/chaos', { scenario: 'carrier-outage' })
      .expect(409);
    expect(second.body.message).toBe('A scenario is already running');
    expect(await overview()).toMatchObject({
      chaos: { ...status, startedAt: started.startedAt },
      cooldownUntil: null,
      scenarios: expect.arrayContaining([
        expect.objectContaining({ id: 'webhook-down' }),
      ]),
    });
    const pulse = await as(admin).get('/admin/pulse').expect(200);
    expect(pulse.body.chaos).toEqual({
      scenario: 'failed-deliveries',
      label: 'Storm: failed deliveries',
      endsAt: started.endsAt,
    });

    await as(admin).delete('/admin/demo/chaos').expect(204);

    await vi.waitFor(() => expect(chaosEvents).toEqual([status, null]));
    const ended = await overview();
    expect(ended.chaos).toBeNull();
    expect(ended.cooldownUntil).toEqual(expect.any(String));
    expect(ended.runs).toEqual([
      expect.objectContaining({
        scenario: 'failed-deliveries',
        reason: 'admin',
      }),
    ]);
    const cooling = await as(admin)
      .post('/admin/demo/chaos', STORM)
      .expect(409);
    expect(cooling.body.message).toBe('Chaos Mode is cooling down');
    await as(admin).delete('/admin/demo/chaos').expect(404);
  });

  it('ends an expired run exactly once', async () => {
    await as(admin).post('/admin/demo/chaos', STORM).expect(201);
    const { runId } = await storedRun();
    const queue = ctx.app.get<Queue>(getQueueToken(DEMO_QUEUE));

    // Stands in for the delay running out.
    await (await queue.getJob(`${CHAOS_END_JOB}-${runId}`))?.promote();

    await vi.waitFor(() => expect(chaosEvents).toHaveLength(2));
    // Long enough for a duplicate end to show if there were one.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(chaosEvents).toHaveLength(2);
    expect(chaosEvents[1]).toBeNull();
    expect((await overview()).runs).toEqual([
      expect.objectContaining({ reason: 'expired' }),
    ]);
  });

  it('admits one of two concurrent starts', async () => {
    const statuses = await Promise.all([
      as(admin).post('/admin/demo/chaos', STORM),
      as(admin).post('/admin/demo/chaos', { scenario: 'carrier-outage' }),
    ]);

    expect(statuses.map(({ status }) => status).sort()).toEqual([201, 409]);
  });

  it('ends a run left past its end by a late end job', async () => {
    await as(admin).post('/admin/demo/chaos', STORM).expect(201);
    const run = await storedRun();
    await redis.set(
      CHAOS_KEY,
      JSON.stringify({
        ...run,
        endsAt: new Date(Date.now() - 1_000).toISOString(),
      }),
    );

    await as(admin).delete('/admin/demo/chaos').expect(204);

    expect((await overview()).runs).toEqual([
      expect.objectContaining({ reason: 'expired' }),
    ]);
  });

  it('ends the running scenario before a reset', async () => {
    await as(admin).post('/admin/demo/chaos', STORM).expect(201);

    await as(admin).post('/admin/demo/reset').expect(204);

    const { chaos, runs } = await overview();
    expect(chaos).toBeNull();
    expect(runs).toEqual([expect.objectContaining({ reason: 'reset' })]);
  });

  it.each([
    { scenario: 'rush-hour' },
    { scenario: 'carrier-outage', durationSec: 120 },
  ])('refuses %o with 400', async (body) => {
    await as(admin).post('/admin/demo/chaos', body).expect(400);
  });

  it('refuses every admin demo route to other roles', async () => {
    await as(seller).get('/admin/demo').expect(403);
    await as(seller).post('/admin/demo/chaos', STORM).expect(403);
    await as(seller).delete('/admin/demo/chaos').expect(403);
  });
});
