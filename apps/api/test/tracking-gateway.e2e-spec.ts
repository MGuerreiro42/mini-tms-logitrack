import request from 'supertest';
import {
  connectSocket,
  createCarrier,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

describe('Authenticated tracking namespace (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('rejects a socket without a token', async () => {
    await expect(connectSocket(ctx, '/')).rejects.toThrow('Missing token');
  });

  it('lets an approved carrier subscribe to its queue', async () => {
    const socket = await connectSocket(ctx, '/', { token: tenants.operator });

    await expect(socket.emitWithAck('subscribe:queue')).resolves.toEqual({
      ok: true,
    });
    socket.disconnect();
  });

  it('blocks an unapproved carrier on REST (403) and on the socket (ok: false)', async () => {
    const pending = await createCarrier(ctx, tenants.modalityId, 'PENDING');
    const token = await pending.token('MANAGER');

    await request(ctx.app.getHttpServer())
      .get('/shipments/queue')
      .auth(token, { type: 'bearer' })
      .expect(403);

    const socket = await connectSocket(ctx, '/', { token });
    await expect(socket.emitWithAck('subscribe:queue')).resolves.toEqual({
      ok: false,
    });
    socket.disconnect();
  });
});
