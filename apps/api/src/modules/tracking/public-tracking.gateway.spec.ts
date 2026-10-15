import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PublicTrackingGateway } from './public-tracking.gateway';

const CODE = 'TMS-ABC123ABC123';

function makeSocket(rooms: string[] = ['socket-id']) {
  return {
    rooms: new Set(rooms),
    data: {},
    join: vi.fn(),
    leave: vi.fn(),
    disconnect: vi.fn(),
  };
}

describe('PublicTrackingGateway', () => {
  let gateway: PublicTrackingGateway;
  const shipmentFindUnique = vi.fn();

  beforeEach(async () => {
    shipmentFindUnique.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicTrackingGateway,
        {
          provide: PrismaService,
          useValue: { shipment: { findUnique: shipmentFindUnique } },
        },
      ],
    }).compile();

    gateway = module.get(PublicTrackingGateway);
  });

  it('joins the tracking room and acks ok when the code exists', async () => {
    shipmentFindUnique.mockResolvedValue({ id: 'shipment-1' });
    const socket = makeSocket();

    const ack = await gateway.handleSubscribeTracking(socket as never, CODE);

    expect(shipmentFindUnique).toHaveBeenCalledWith({
      where: { trackingCode: CODE },
      select: { id: true },
    });
    expect(socket.join).toHaveBeenCalledWith(`tracking:${CODE}`);
    expect(ack).toEqual({ ok: true });
  });

  it('leaves the previous tracking room, keeping other rooms', async () => {
    shipmentFindUnique.mockResolvedValue({ id: 'shipment-2' });
    const socket = makeSocket(['socket-id', 'tracking:TMS-000000000001']);

    await gateway.handleSubscribeTracking(socket as never, CODE);

    expect(socket.leave).toHaveBeenCalledTimes(1);
    expect(socket.leave).toHaveBeenCalledWith('tracking:TMS-000000000001');
    expect(socket.join).toHaveBeenCalledWith(`tracking:${CODE}`);
  });

  it('acks not ok and does not join when the code does not exist', async () => {
    shipmentFindUnique.mockResolvedValue(null);
    const socket = makeSocket();

    const ack = await gateway.handleSubscribeTracking(socket as never, CODE);

    expect(socket.join).not.toHaveBeenCalled();
    expect(ack).toEqual({ ok: false });
  });

  it.each([
    undefined,
    '',
    42,
    { code: CODE },
    'TMS-ABC123',
    'tms-abc123abc123',
    `${CODE}%`,
  ])('acks not ok without querying for a malformed code (%j)', async (payload) => {
    const socket = makeSocket();

    const ack = await gateway.handleSubscribeTracking(socket as never, payload);

    expect(shipmentFindUnique).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(ack).toEqual({ ok: false });
  });

  describe('subscribe limit', () => {
    const subscribe = (socket: ReturnType<typeof makeSocket>, times: number) =>
      Promise.all(
        Array.from({ length: times }, () =>
          gateway.handleSubscribeTracking(socket as never, CODE),
        ),
      );

    beforeEach(() => {
      vi.useFakeTimers();
      shipmentFindUnique.mockResolvedValue({ id: 'shipment-1' });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('disconnects a socket on its 11th subscribe within 10 seconds, without querying', async () => {
      const socket = makeSocket();
      await subscribe(socket, 10);
      expect(socket.disconnect).not.toHaveBeenCalled();

      const [ack] = await subscribe(socket, 1);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(shipmentFindUnique).toHaveBeenCalledTimes(10);
      expect(ack).toEqual({ ok: false });
    });

    it('counts malformed codes too', async () => {
      const socket = makeSocket();
      for (let attempt = 0; attempt < 11; attempt++) {
        await gateway.handleSubscribeTracking(socket as never, 'nope');
      }

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('starts a fresh window after 10 seconds', async () => {
      const socket = makeSocket();
      await subscribe(socket, 10);

      vi.advanceTimersByTime(10_000);
      const [ack] = await subscribe(socket, 1);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(ack).toEqual({ ok: true });
    });

    it('keeps a separate count per socket', async () => {
      await subscribe(makeSocket(), 10);
      const other = makeSocket();

      const [ack] = await subscribe(other, 1);

      expect(other.disconnect).not.toHaveBeenCalled();
      expect(ack).toEqual({ ok: true });
    });
  });

  it('leaves the tracking room on unsubscribe', async () => {
    const socket = makeSocket(['socket-id', `tracking:${CODE}`]);

    const ack = await gateway.handleUnsubscribeTracking(socket as never, CODE);

    expect(socket.leave).toHaveBeenCalledWith(`tracking:${CODE}`);
    expect(ack).toEqual({ ok: true });
  });
});
