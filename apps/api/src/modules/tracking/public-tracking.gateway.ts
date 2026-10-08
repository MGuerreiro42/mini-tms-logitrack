import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { PrismaService } from '../../shared/prisma/prisma.service';

export const trackingRoom = (trackingCode: string) =>
  `tracking:${trackingCode}`;

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
    if (typeof trackingCode !== 'string' || trackingCode.length === 0) {
      return { ok: false };
    }

    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingCode },
      select: { id: true },
    });
    if (!shipment) {
      return { ok: false };
    }

    await client.join(trackingRoom(trackingCode));
    return { ok: true };
  }
}
