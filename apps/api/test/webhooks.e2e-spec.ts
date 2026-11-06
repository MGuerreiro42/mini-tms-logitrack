import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { signWebhook } from '../src/modules/integrations/webhook-signature';
import { DEMO_RESET } from '../src/modules/simulator/demo-events';
import {
  createShipment,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

interface Endpoint {
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  inboxUrl: string;
}
interface Delivery {
  id: string;
  status: string;
  attempts: number;
  responseCode: number | null;
  nextAttemptAt: string | null;
  payload: { type: string; data: { trackingCode: string } };
}

const WAIT = { timeout: 5_000 };

describe('Webhooks (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;

  const as = (token: string) => ({
    get: (path: string) =>
      request(ctx.app.getHttpServer())
        .get(path)
        .auth(token, { type: 'bearer' }),
    post: (path: string) =>
      request(ctx.app.getHttpServer())
        .post(path)
        .auth(token, { type: 'bearer' }),
    patch: (path: string) =>
      request(ctx.app.getHttpServer())
        .patch(path)
        .auth(token, { type: 'bearer' }),
  });

  const endpointOf = async (token: string): Promise<Endpoint> =>
    (await as(token).get('/webhooks/endpoint').expect(200)).body;

  const deliveriesOf = async (token: string): Promise<Delivery[]> =>
    (await as(token).get('/webhooks/deliveries').expect(200)).body.data;

  async function deliveryFor(token: string, trackingCode: string) {
    return vi.waitFor(async () => {
      const delivery = (await deliveriesOf(token)).find(
        (d) => d.payload.data.trackingCode === trackingCode,
      );
      expect(delivery?.attempts).toBeGreaterThan(0);
      return delivery as Delivery;
    }, WAIT);
  }

  const inboxPath = (endpoint: Endpoint) => new URL(endpoint.inboxUrl).pathname;

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('starts every seller on an active endpoint pointing at their own inbox', async () => {
    const endpoint = await endpointOf(tenants.sellerA);

    expect(endpoint).toMatchObject({
      url: endpoint.inboxUrl,
      active: true,
      events: ['SHIPMENT_CREATED', 'SHIPMENT_STATUS_CHANGED'],
    });
    expect(endpoint.secret).toMatch(/^whsec_/);
    expect(await endpointOf(tenants.sellerA)).toEqual(endpoint);
  });

  it('creates the endpoint once when the first reads arrive together', async () => {
    const { sellerA: freshSeller } = await createTenants(ctx);

    await Promise.all([
      as(freshSeller).get('/webhooks/endpoint').expect(200),
      as(freshSeller).get('/webhooks/inbox').expect(200),
    ]);
  });

  it('provisions the endpoint on the first event of a seller who never opened Integrations', async () => {
    const freshSeller = await tenants.sellerToken();
    const shipment = await createShipment(ctx, freshSeller, tenants);

    const delivery = await deliveryFor(freshSeller, shipment.trackingCode);

    expect(delivery).toMatchObject({
      status: 'SUCCEEDED',
      payload: { type: 'shipment.created' },
    });
    expect(await endpointOf(freshSeller)).toMatchObject({ active: true });
  });

  it('delivers a signed event to the inbox and logs it as succeeded', async () => {
    await endpointOf(tenants.sellerA);
    const shipment = await createShipment(ctx, tenants.sellerA, tenants);

    const delivery = await deliveryFor(tenants.sellerA, shipment.trackingCode);
    const inbox = (await as(tenants.sellerA).get('/webhooks/inbox').expect(200))
      .body;

    expect(delivery).toMatchObject({
      status: 'SUCCEEDED',
      attempts: 1,
      responseCode: 200,
      payload: { type: 'shipment.created' },
    });
    expect(inbox.requests[0]).toMatchObject({
      webhookId: delivery.id,
      signatureValid: true,
      responseStatus: 200,
    });
  });

  it('checks signatures of requests sent to the public inbox URL', async () => {
    const endpoint = await endpointOf(tenants.sellerA);
    const body = '{"type":"ping"}';
    const headers = signWebhook(
      endpoint.secret,
      'msg_e2e',
      Math.floor(Date.now() / 1000),
      body,
    );
    const post = () =>
      request(ctx.app.getHttpServer())
        .post(inboxPath(endpoint))
        .set('content-type', 'application/json');

    await post()
      .set({ ...headers })
      .send(body)
      .expect(200);
    await post()
      .set({ ...headers, 'webhook-signature': 'v1,Zm9yZ2Vk' })
      .send(body)
      .expect(200);

    const { requests } = (await as(tenants.sellerA).get('/webhooks/inbox'))
      .body;
    expect(requests[0]).toMatchObject({ signatureValid: false });
    expect(requests[1]).toMatchObject({
      webhookId: 'msg_e2e',
      signatureValid: true,
      body,
    });
    await request(ctx.app.getHttpServer())
      .post('/webhook-inbox/00000000-0000-4000-8000-000000000000')
      .send(body)
      .expect(404);
  });

  it('schedules a retry when the inbox fails, and replays on request', async () => {
    await as(tenants.sellerA)
      .patch('/webhooks/inbox')
      .send({ failRequests: true })
      .expect(200);
    const shipment = await createShipment(ctx, tenants.sellerA, tenants);

    const failed = await deliveryFor(tenants.sellerA, shipment.trackingCode);
    expect(failed).toMatchObject({
      status: 'PENDING',
      attempts: 1,
      responseCode: 500,
    });
    const retryIn =
      new Date(failed.nextAttemptAt as string).getTime() - Date.now();
    expect(retryIn).toBeGreaterThan(5_000);
    expect(retryIn).toBeLessThanOrEqual(10_000);

    await as(tenants.sellerA)
      .patch('/webhooks/inbox')
      .send({ failRequests: false })
      .expect(200);
    const replay = await as(tenants.sellerA)
      .post(`/webhooks/deliveries/${failed.id}/replay`)
      .expect(201);
    expect(replay.body.id).not.toBe(failed.id);
    expect(replay.body.payload).toEqual(failed.payload);
    await vi.waitFor(async () => {
      const replayed = (await deliveriesOf(tenants.sellerA)).find(
        (d) => d.id === replay.body.id,
      );
      expect(replayed?.status).toBe('SUCCEEDED');
    }, WAIT);
  });

  it("keeps deliveries to their seller: another seller can't see or replay them", async () => {
    const [delivery] = await deliveriesOf(tenants.sellerA);
    await endpointOf(tenants.sellerB);

    expect(await deliveriesOf(tenants.sellerB)).toEqual([]);
    await as(tenants.sellerB)
      .post(`/webhooks/deliveries/${delivery.id}/replay`)
      .expect(404);
  });

  it.each([
    ['plain http', 'http://example.com/hook'],
    ['loopback', 'https://127.0.0.1/hook'],
    ['cloud metadata', 'https://169.254.169.254/latest'],
    ['a name resolving to loopback', 'https://localhost/hook'],
  ])('refuses an endpoint URL with %s', async (_, url) => {
    await as(tenants.sellerA)
      .patch('/webhooks/endpoint')
      .send({ url })
      .expect(400);
  });

  it('fails pending retries and sends nothing while the endpoint is disabled', async () => {
    await endpointOf(tenants.sellerB);
    await as(tenants.sellerB)
      .patch('/webhooks/inbox')
      .send({ failRequests: true })
      .expect(200);
    const retrying = await deliveryFor(
      tenants.sellerB,
      (await createShipment(ctx, tenants.sellerB, tenants)).trackingCode,
    );
    expect(retrying.status).toBe('PENDING');

    await as(tenants.sellerB)
      .patch('/webhooks/endpoint')
      .send({ active: false })
      .expect(200);
    await createShipment(ctx, tenants.sellerB, tenants);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const deliveries = await deliveriesOf(tenants.sellerB);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({ id: retrying.id, status: 'FAILED' });
  });

  it('restores the demo sellers on a demo reset', async () => {
    const endpoint = await endpointOf(tenants.sellerA);
    const inboxId = inboxPath(endpoint).split('/').pop();
    const { sellerId } = await ctx.prisma.webhookEndpoint.findUniqueOrThrow({
      where: { inboxId },
    });
    await as(tenants.sellerA)
      .post('/api-keys')
      .send({ name: 'visitor' })
      .expect(201);
    await as(tenants.sellerA)
      .patch('/webhooks/endpoint')
      .send({ url: 'https://8.8.8.8/hook', active: false })
      .expect(200);

    await ctx.app
      .get(EventEmitter2)
      .emitAsync(DEMO_RESET, { sellerIds: [sellerId] });

    const restored = await endpointOf(tenants.sellerA);
    expect(restored).toMatchObject({ url: restored.inboxUrl, active: true });
    expect(restored.inboxUrl).not.toBe(endpoint.inboxUrl);
    expect(restored.secret).not.toBe(endpoint.secret);
    expect(await deliveriesOf(tenants.sellerA)).toEqual([]);
    expect(
      (await as(tenants.sellerA).get('/webhooks/inbox')).body.requests,
    ).toEqual([]);
    expect((await as(tenants.sellerA).get('/api-keys')).body).toEqual([]);
  });
});
