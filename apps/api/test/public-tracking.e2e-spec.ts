import { io, type Socket } from 'socket.io-client';
import {
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

    // No auth token: the namespace must accept anonymous clients.
    socket = io(`${ctx.url}/public`, {
      transports: ['websocket'],
      reconnection: false,
    });
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
  });

  afterAll(async () => {
    socket?.disconnect();
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
});
