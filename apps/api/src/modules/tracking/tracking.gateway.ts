import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../auth/strategies/jwt.strategy';

interface SocketData {
  user: AuthenticatedUser;
  // Resolved once at connection time so subscribe handlers don't re-query on
  // every message — a seller's own sellerId, or a carrier user's carrierId.
  sellerId?: string;
  carrierId?: string;
}

// Auth runs as Socket.IO connection *middleware* (server.use), not in
// handleConnection. This isn't a style choice: handleConnection is async but
// Socket.IO already emits 'connect' client-side as soon as the handshake
// itself completes, without waiting for handleConnection's promise to
// settle — a client that subscribes immediately after 'connect' can (and, in
// manual testing, reliably did) race ahead of handleConnection's two DB
// round-trips, arriving with `client.data` still empty. Middleware
// registered via `server.use()` is awaited by Socket.IO *before* 'connect'
// fires, which is exactly why the library exposes it — same principle as
// this codebase's HTTP guards running before a handler, just via a different
// mechanism because @nestjs/websockets' CanActivate guards don't intercept
// the connection lifecycle at all (only @SubscribeMessage handlers do).
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

  // Mirrors JwtStrategy.validate: reload the user from the database rather
  // than trusting the token's claims alone, so a deleted user can't stay
  // "authenticated" just because their token hasn't expired. One query, not
  // two — User has a direct seller/carrierUser relation, so the role-specific
  // follow-up lookup is included here instead of a second round-trip.
  private async authenticate(socket: Socket): Promise<void> {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      throw new Error('Missing token');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { seller: true, carrierUser: true },
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
      user.role === 'CARRIER_MANAGER' ||
      user.role === 'CARRIER_OPERATOR'
    ) {
      data.carrierId = user.carrierUser?.carrierId;
    }

    socket.data = data;
  }

  // A seller may only subscribe to their own shipment's room; a carrier user
  // only to a shipment in their own carrier — same ownership-scoping
  // discipline as every REST endpoint in this codebase (DESIGN.md § 16's
  // "Ownership-Based Authorization" principle applied to WebSocket rooms).
  @SubscribeMessage('subscribe:shipment')
  async handleSubscribeShipment(
    client: Socket,
    shipmentId: string,
  ): Promise<void> {
    // No `data.user` presence check here (unlike `data.carrierId` below,
    // which is a real optional field): the connection middleware above
    // rejects the handshake outright on auth failure, so `data.user` is
    // always populated by the time any @SubscribeMessage handler can run.
    const data = client.data as SocketData;

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { sellerId: true, carrierId: true },
    });
    if (!shipment) return;

    const allowed =
      (data.user.role === 'SELLER' && shipment.sellerId === data.sellerId) ||
      ((data.user.role === 'CARRIER_MANAGER' ||
        data.user.role === 'CARRIER_OPERATOR') &&
        shipment.carrierId === data.carrierId);

    if (allowed) {
      client.join(`shipment:${shipmentId}`);
    }
  }

  // No payload needed — the queue is always the caller's own carrier,
  // resolved once at connection time, not something a client can pick.
  @SubscribeMessage('subscribe:queue')
  handleSubscribeQueue(client: Socket): void {
    const data = client.data as SocketData;
    if (!data?.carrierId) return;
    client.join(`carrier:${data.carrierId}`);
  }
}
