import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { TRACKING_CODE_PATTERN } from '../shipments/tracking-code';
import { TRACKING_ROOM_PREFIX, trackingRoom } from './tracking-rooms';

const SUBSCRIBE_LIMIT = 10;
const SUBSCRIBE_WINDOW_MS = 10_000;

interface SocketData {
  subscribeWindow?: { startedAt: number; count: number };
}

// Unauthenticated on purpose: the tracking code is the credential, as on GET /public/tracking/:code.
@WebSocketGateway({ namespace: '/public' })
export class PublicTrackingGateway {
  @WebSocketServer()
  server: Namespace;

  constructor(private readonly prisma: PrismaService) {}

  @SubscribeMessage('subscribe:tracking')
  async handleSubscribeTracking(
    client: Socket,
    trackingCode: unknown,
  ): Promise<{ ok: boolean }> {
    if (this.exceedsSubscribeLimit(client)) {
      client.disconnect(true);
      return { ok: false };
    }
    if (
      typeof trackingCode !== 'string' ||
      !TRACKING_CODE_PATTERN.test(trackingCode)
    ) {
      return { ok: false };
    }

    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingCode },
      select: { id: true },
    });
    if (!shipment) {
      return { ok: false };
    }

    const room = trackingRoom(trackingCode);
    // One tracking room per socket, so a client can't fan out over many codes.
    for (const joined of [...client.rooms]) {
      if (joined.startsWith(TRACKING_ROOM_PREFIX) && joined !== room) {
        await client.leave(joined);
      }
    }
    await client.join(room);
    return { ok: true };
  }

  private exceedsSubscribeLimit(client: Socket): boolean {
    const data = client.data as SocketData;
    const now = Date.now();
    const current = data.subscribeWindow;
    const window =
      current && now - current.startedAt < SUBSCRIBE_WINDOW_MS
        ? current
        : { startedAt: now, count: 0 };
    window.count += 1;
    data.subscribeWindow = window;
    return window.count > SUBSCRIBE_LIMIT;
  }
}
