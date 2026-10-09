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
import { isCarrierRole } from '../auth/carrier-roles';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../auth/strategies/jwt.strategy';

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
        carrierUser: { select: { carrierId: true } },
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
    } else if (isCarrierRole(user.role)) {
      data.carrierId = user.carrierUser?.carrierId;
    }

    socket.data = data;
  }

  // Same ownership scoping as the REST endpoints.
  @SubscribeMessage('subscribe:shipment')
  async handleSubscribeShipment(
    client: Socket,
    shipmentId: string,
  ): Promise<void> {
    const data = client.data as SocketData;

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { sellerId: true, carrierId: true },
    });
    if (!shipment) return;

    const allowed =
      (data.user.role === 'SELLER' && shipment.sellerId === data.sellerId) ||
      (isCarrierRole(data.user.role) && shipment.carrierId === data.carrierId);

    if (allowed) {
      client.join(`shipment:${shipmentId}`);
    }
  }

  @SubscribeMessage('subscribe:queue')
  handleSubscribeQueue(client: Socket): void {
    const data = client.data as SocketData;
    if (!data?.carrierId) return;
    client.join(`carrier:${data.carrierId}`);
  }

  @SubscribeMessage('subscribe:monitoring')
  handleSubscribeMonitoring(client: Socket): void {
    const data = client.data as SocketData;
    if (data.user.role !== 'ADMIN') return;
    client.join('admin:monitoring');
  }
}
