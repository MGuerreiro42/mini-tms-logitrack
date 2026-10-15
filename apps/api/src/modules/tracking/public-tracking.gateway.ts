import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { TRACKING_CODE_PATTERN } from '../shipments/tracking-code';
import { TRACKING_ROOM_PREFIX, trackingRoom } from './tracking-rooms';

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
}
