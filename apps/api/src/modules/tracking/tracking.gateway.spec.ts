import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { TrackingGateway } from './tracking.gateway';

function makeSocket() {
  return {
    handshake: { auth: {} as { token?: string } },
    data: undefined as unknown,
    join: vi.fn(),
  };
}

describe('TrackingGateway', () => {
  let gateway: TrackingGateway;
  const verifyAsync = vi.fn();
  const userFindUnique = vi.fn();
  const shipmentFindUnique = vi.fn();

  beforeEach(async () => {
    verifyAsync.mockReset();
    userFindUnique.mockReset();
    shipmentFindUnique.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingGateway,
        { provide: JwtService, useValue: { verifyAsync } },
        {
          provide: PrismaService,
          useValue: {
            // authenticate() resolves seller/carrierUser via a single
            // `include`, not a separate query — the mock returns them
            // nested on the user row, matching the real combined shape.
            user: { findUnique: userFindUnique },
            shipment: { findUnique: shipmentFindUnique },
          },
        },
      ],
    }).compile();

    gateway = module.get(TrackingGateway);
  });

  describe('afterInit', () => {
    it('registers a Socket.IO connection middleware via server.use', () => {
      const use = vi.fn();

      gateway.afterInit({ use } as never);

      expect(use).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  // Auth runs as connection middleware (server.use), not handleConnection —
  // handleConnection is async but Socket.IO already emits 'connect'
  // client-side once the handshake itself completes, without waiting for
  // handleConnection's promise to settle. A client that subscribes
  // immediately after 'connect' could (and, in manual testing, reliably did)
  // race ahead of two DB round-trips, arriving with client.data still empty.
  // Middleware registered via server.use() is awaited by Socket.IO *before*
  // 'connect' fires, closing that race — tested here by calling the private
  // `authenticate` method directly (the function server.use() wraps), since
  // that's where all the actual logic lives.
  describe('authenticate (the middleware body)', () => {
    function authenticate(socket: unknown) {
      return (
        gateway as unknown as { authenticate: (s: unknown) => Promise<void> }
      ).authenticate(socket);
    }

    it('throws when no token is provided', async () => {
      const socket = makeSocket();

      await expect(authenticate(socket)).rejects.toThrow();
    });

    it('throws when the token fails verification', async () => {
      verifyAsync.mockRejectedValue(new Error('invalid signature'));
      const socket = makeSocket();
      socket.handshake.auth.token = 'bad-token';

      await expect(authenticate(socket)).rejects.toThrow();
    });

    it('throws when the user no longer exists (deleted-user precedent, same as JwtStrategy)', async () => {
      verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'a@a.com',
        role: 'SELLER',
      });
      userFindUnique.mockResolvedValue(null);
      const socket = makeSocket();
      socket.handshake.auth.token = 'good-token';

      await expect(authenticate(socket)).rejects.toThrow();
    });

    it('resolves sellerId onto socket.data for a SELLER', async () => {
      verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'seller@example.com',
        role: 'SELLER',
      });
      userFindUnique.mockResolvedValue({
        id: 'user-1',
        email: 'seller@example.com',
        role: 'SELLER',
        seller: { id: 'seller-1' },
        carrierUser: null,
      });
      const socket = makeSocket();
      socket.handshake.auth.token = 'good-token';

      await authenticate(socket);

      expect((socket.data as { sellerId?: string }).sellerId).toBe('seller-1');
    });

    it('resolves carrierId onto socket.data for a CARRIER_OPERATOR', async () => {
      verifyAsync.mockResolvedValue({
        sub: 'user-2',
        email: 'op@example.com',
        role: 'CARRIER_OPERATOR',
      });
      userFindUnique.mockResolvedValue({
        id: 'user-2',
        email: 'op@example.com',
        role: 'CARRIER_OPERATOR',
        seller: null,
        carrierUser: { carrierId: 'carrier-1' },
      });
      const socket = makeSocket();
      socket.handshake.auth.token = 'good-token';

      await authenticate(socket);

      expect((socket.data as { carrierId?: string }).carrierId).toBe(
        'carrier-1',
      );
    });
  });

  describe('handleSubscribeShipment', () => {
    it('joins the room when a seller subscribes to their own shipment', async () => {
      const socket = makeSocket();
      socket.data = { user: { role: 'SELLER' }, sellerId: 'seller-1' };
      shipmentFindUnique.mockResolvedValue({
        sellerId: 'seller-1',
        carrierId: 'carrier-1',
      });

      await gateway.handleSubscribeShipment(socket as never, 'shipment-1');

      expect(socket.join).toHaveBeenCalledWith('shipment:shipment-1');
    });

    it("rejects when a seller subscribes to another seller's shipment", async () => {
      const socket = makeSocket();
      socket.data = { user: { role: 'SELLER' }, sellerId: 'seller-1' };
      shipmentFindUnique.mockResolvedValue({
        sellerId: 'someone-elses-seller',
        carrierId: 'carrier-1',
      });

      await gateway.handleSubscribeShipment(socket as never, 'shipment-1');

      expect(socket.join).not.toHaveBeenCalled();
    });

    it('joins the room when a carrier user subscribes to a shipment in their own carrier', async () => {
      const socket = makeSocket();
      socket.data = {
        user: { role: 'CARRIER_OPERATOR' },
        carrierId: 'carrier-1',
      };
      shipmentFindUnique.mockResolvedValue({
        sellerId: 'seller-1',
        carrierId: 'carrier-1',
      });

      await gateway.handleSubscribeShipment(socket as never, 'shipment-1');

      expect(socket.join).toHaveBeenCalledWith('shipment:shipment-1');
    });

    it("rejects when a carrier user subscribes to another carrier's shipment", async () => {
      const socket = makeSocket();
      socket.data = {
        user: { role: 'CARRIER_OPERATOR' },
        carrierId: 'carrier-1',
      };
      shipmentFindUnique.mockResolvedValue({
        sellerId: 'seller-1',
        carrierId: 'someone-elses-carrier',
      });

      await gateway.handleSubscribeShipment(socket as never, 'shipment-1');

      expect(socket.join).not.toHaveBeenCalled();
    });

    it('no-ops when the shipment does not exist', async () => {
      const socket = makeSocket();
      socket.data = { user: { role: 'SELLER' }, sellerId: 'seller-1' };
      shipmentFindUnique.mockResolvedValue(null);

      await gateway.handleSubscribeShipment(socket as never, 'nonexistent');

      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscribeQueue', () => {
    it("joins the caller's own carrier room", () => {
      const socket = makeSocket();
      socket.data = {
        user: { role: 'CARRIER_OPERATOR' },
        carrierId: 'carrier-1',
      };

      gateway.handleSubscribeQueue(socket as never);

      expect(socket.join).toHaveBeenCalledWith('carrier:carrier-1');
    });

    it('no-ops for a socket with no resolved carrierId (e.g. a seller)', () => {
      const socket = makeSocket();
      socket.data = { user: { role: 'SELLER' } };

      gateway.handleSubscribeQueue(socket as never);

      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscribeMonitoring', () => {
    it('joins the shared admin room for an ADMIN socket', () => {
      const socket = makeSocket();
      socket.data = { user: { role: 'ADMIN' } };

      gateway.handleSubscribeMonitoring(socket as never);

      expect(socket.join).toHaveBeenCalledWith('admin:monitoring');
    });

    it('no-ops for a non-admin socket', () => {
      const socket = makeSocket();
      socket.data = {
        user: { role: 'CARRIER_MANAGER' },
        carrierId: 'carrier-1',
      };

      gateway.handleSubscribeMonitoring(socket as never);

      expect(socket.join).not.toHaveBeenCalled();
    });
  });
});
