import type { Socket } from 'socket.io-client';
import {
  connectSocket,
  createShipment,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

describe('Public tracking namespace (e2e)', () => {
  let ctx: E2eContext;
  let socket: Socket;
  let trackingCode: string;

  beforeAll(async () => {
    ctx = await startApp();
    const tenants = await createTenants(ctx);
    ({ trackingCode } = await createShipment(ctx, tenants.sellerA, tenants));
  });

  beforeEach(async () => {
    socket = await connectSocket(ctx, '/public');
  });

  afterEach(() => {
    socket.disconnect();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('acks ok for an existing tracking code', async () => {
    await expect(
      socket.emitWithAck('subscribe:tracking', trackingCode),
    ).resolves.toEqual({ ok: true });
  });

  it('acks not ok for an unknown or malformed code', async () => {
    await expect(
      socket.emitWithAck('subscribe:tracking', 'TMS-000000000000'),
    ).resolves.toEqual({ ok: false });
    await expect(
      socket.emitWithAck('subscribe:tracking', 'not-a-code'),
    ).resolves.toEqual({ ok: false });
  });

  it('disconnects a socket that subscribes more than 10 times in 10 seconds', async () => {
    const disconnected = new Promise<string>((resolve) => {
      socket.once('disconnect', resolve);
    });

    for (let attempt = 0; attempt < 10; attempt++) {
      await socket.emitWithAck('subscribe:tracking', trackingCode);
    }
    socket.emit('subscribe:tracking', trackingCode);

    await expect(disconnected).resolves.toBe('io server disconnect');
  });
});
