import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ApprovalStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { isCarrierRole } from '../auth/carrier-roles';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../auth/strategies/jwt.strategy';
import {
  ADMIN_MONITORING_ROOM,
  carrierRoom,
  shipmentRoom,
} from './tracking-rooms';

interface SocketData {
  user: AuthenticatedUser;
  // Resolved once at connection so subscribe handlers don't re-query.
  sellerId?: string;
  carrierId?: string;
}

// Auth as server.use() middleware: awaited before 'connect', unlike handleConnection.
@WebSocketGateway()
export class TrackingGateway implements OnGatewayInit {
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      this.authenticate(socket)
        .then(() => next())
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(`WebSocket auth failed: ${message}`);
          next(error instanceof Error ? error : new Error('Unauthorized'));
        });
    });
  }

  // Reload the user like JwtStrategy, so a deleted user's unexpired token stops working.
  private async authenticate(socket: Socket): Promise<void> {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      throw new Error('Missing token');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        seller: { select: { id: true } },
        carrierUser: {
          select: { carrierId: true, carrier: { select: { status: true } } },
        },
      },
    });
    if (!user) {
      throw new Error('User no longer exists');
    }

    const data: SocketData = {
      user: { id: user.id, email: user.email, role: user.role },
    };

    if (user.role === 'SELLER') {
      data.sellerId = user.seller?.id;
    } else if (
      isCarrierRole(user.role) &&
      user.carrierUser?.carrier.status === ApprovalStatus.APPROVED
    ) {
      // Unapproved carriers get no carrierId, so every carrier room stays closed to them.
      data.carrierId = user.carrierUser.carrierId;
    }

    socket.data = data;
  }

  // Same ownership scoping as the REST endpoints.
  // Each handler acks { ok } (true only once the room is joined); clients without a callback still work.
  @SubscribeMessage('subscribe:shipment')
  async handleSubscribeShipment(
    client: Socket,
    shipmentId: unknown,
  ): Promise<{ ok: boolean }> {
    if (typeof shipmentId !== 'string') return { ok: false };
    const data = client.data as SocketData;

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { sellerId: true, carrierId: true },
    });
    if (!shipment) return { ok: false };

    const allowed =
      (data.user.role === 'SELLER' && shipment.sellerId === data.sellerId) ||
      (isCarrierRole(data.user.role) && shipment.carrierId === data.carrierId);
    if (!allowed) return { ok: false };

    await client.join(shipmentRoom(shipmentId));
    return { ok: true };
  }

  @SubscribeMessage('subscribe:queue')
  async handleSubscribeQueue(client: Socket): Promise<{ ok: boolean }> {
    const data = client.data as SocketData;
    if (!data.carrierId) return { ok: false };
    await client.join(carrierRoom(data.carrierId));
    return { ok: true };
  }

  @SubscribeMessage('subscribe:monitoring')
  async handleSubscribeMonitoring(client: Socket): Promise<{ ok: boolean }> {
    const data = client.data as SocketData;
    if (data.user.role !== 'ADMIN') return { ok: false };
    await client.join(ADMIN_MONITORING_ROOM);
    return { ok: true };
  }
}
