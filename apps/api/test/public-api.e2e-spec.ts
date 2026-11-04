import request from 'supertest';
import { RateLimitGuard } from '../src/shared/throttling/rate-limit.guard';
import {
  createTenants,
  type E2eContext,
  shipmentBody,
  startApp,
} from './support/e2e-app';

describe('Public API (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;
  // ThrottlerGuard binds getTracker when the app starts, so the spy goes in first.
  const getTracker = vi.spyOn(
    RateLimitGuard.prototype as unknown as {
      getTracker: (req: object) => Promise<string>;
    },
    'getTracker',
  );

  const server = () => request(ctx.app.getHttpServer());

  async function createKey(sellerToken: string) {
    const res = await server()
      .post('/api-keys')
      .auth(sellerToken, { type: 'bearer' })
      .send({ name: 'ERP sync' })
      .expect(201);
    return res.body as { id: string; key: string; prefix: string };
  }

  const createViaKey = (key: string) =>
    server()
      .post('/v1/shipments')
      .set('X-Api-Key', key)
      .send(shipmentBody(tenants));

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
    getTracker.mockRestore();
  });

  it('shows the key once and lists only its prefix', async () => {
    const created = await createKey(tenants.sellerA);

    expect(created.key).toMatch(/^tms_[\w-]{43}$/);
    expect(created.prefix).toBe(created.key.slice(0, 12));
    const list = await server()
      .get('/api-keys')
      .auth(tenants.sellerA, { type: 'bearer' })
      .expect(200);
    const listed = list.body.find((k: { id: string }) => k.id === created.id);
    expect(listed).toMatchObject({ prefix: created.prefix, name: 'ERP sync' });
    expect(listed).not.toHaveProperty('key');
  });

  it("creates and reads the key's seller shipments, and only theirs", async () => {
    const { key } = await createKey(tenants.sellerA);
    const { key: otherKey } = await createKey(tenants.sellerB);

    const created = await createViaKey(key).expect(201);
    const list = await server()
      .get('/v1/shipments')
      .set('X-Api-Key', key)
      .expect(200);
    await server()
      .get(`/v1/shipments/${created.body.id}`)
      .set('X-Api-Key', key)
      .expect(200);
    await server()
      .get(`/v1/shipments/${created.body.id}`)
      .set('X-Api-Key', otherKey)
      .expect(404);
    const app = await server()
      .get('/shipments')
      .auth(tenants.sellerA, { type: 'bearer' })
      .expect(200);

    expect(list.body.data.map((s: { id: string }) => s.id)).toContain(
      created.body.id,
    );
    expect(app.body.data.map((s: { id: string }) => s.id)).toContain(
      created.body.id,
    );
  });

  it('rejects missing, unknown and revoked keys', async () => {
    const { id, key } = await createKey(tenants.sellerA);
    await server()
      .delete(`/api-keys/${id}`)
      .auth(tenants.sellerA, { type: 'bearer' })
      .expect(204);

    await server().get('/v1/shipments').expect(401);
    await server()
      .get('/v1/shipments')
      .set('X-Api-Key', 'tms_nope')
      .expect(401);
    await server().get('/v1/shipments').set('X-Api-Key', key).expect(401);
  });

  it('rate limits by API key, not by address', async () => {
    const { id, key } = await createKey(tenants.sellerA);

    await server().get('/v1/shipments').set('X-Api-Key', key).expect(200);

    await expect(getTracker.mock.results.at(-1)?.value).resolves.toBe(
      `api-key:${id}`,
    );
  });

  it('reserves API key management to sellers', async () => {
    await server()
      .post('/api-keys')
      .auth(tenants.operator, { type: 'bearer' })
      .send({ name: 'x' })
      .expect(403);
  });
});
