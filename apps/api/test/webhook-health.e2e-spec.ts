import request from 'supertest';
import { createTenants, type E2eContext, startApp } from './support/e2e-app';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

describe('Webhook health (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;

  const healthOf = (token: string) =>
    request(ctx.app.getHttpServer())
      .get('/webhooks/health')
      .auth(token, { type: 'bearer' });
  // A seller whose endpoint finished these deliveries, newest first (S succeeded, F failed).
  const sellerWith = async (statuses: string) => {
    const token = await tenants.sellerToken();
    const { body } = await request(ctx.app.getHttpServer())
      .get('/webhooks/endpoint')
      .auth(token, { type: 'bearer' })
      .expect(200);
    // The secret is per endpoint, so it finds the one just created.
    const endpoint = await ctx.prisma.webhookEndpoint.findFirstOrThrow({
      where: { secret: body.secret },
    });
    await ctx.prisma.webhookDelivery.createMany({
      data: [...statuses].map((s, i) => ({
        endpointId: endpoint.id,
        event: 'SHIPMENT_CREATED' as const,
        payload: {},
        status: s === 'S' ? ('SUCCEEDED' as const) : ('FAILED' as const),
        durationMs: 100,
        createdAt: minutesAgo(i + 1),
        updatedAt: minutesAgo(i + 1),
      })),
    });
    return token;
  };

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('is not_configured before the seller has an endpoint', async () => {
    const { body } = await healthOf(await tenants.sellerToken()).expect(200);

    expect(body).toMatchObject({ state: 'not_configured', n: 0 });
  });

  it.each([
    ['too_few', 'SSSS', 100],
    ['ok', `${'S'.repeat(19)}F`, 95],
    ['degraded', `${'S'.repeat(18)}FF`, 90],
  ])('is %s', async (state, statuses, successRate) => {
    const { body } = await healthOf(await sellerWith(statuses)).expect(200);

    expect(body).toMatchObject({
      state,
      n: statuses.length,
      successRate,
      p95Ms: 100,
      failingSince: null,
    });
  });

  it('is down once the last 5 failed, failing since the first of them', async () => {
    const token = await sellerWith('FFFFFS');

    const { body } = await healthOf(token).expect(200);

    expect(body).toMatchObject({ state: 'down', n: 6 });
    expect(Date.parse(body.failingSince)).toBeCloseTo(
      minutesAgo(5).getTime(),
      -4,
    );
    expect(Date.parse(body.lastSuccessAt)).toBeLessThan(
      Date.parse(body.failingSince),
    );
  });

  it('is reserved to sellers', async () => {
    await healthOf(tenants.manager).expect(403);
  });
});
