import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PublicTrackingGateway } from './public-tracking.gateway';

describe('PublicTrackingGateway', () => {
  let gateway: PublicTrackingGateway;
  const shipmentFindUnique = vi.fn();
  const join = vi.fn();
  const socket = { join } as never;

  beforeEach(async () => {
    shipmentFindUnique.mockReset();
    join.mockReset();

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

    const ack = await gateway.handleSubscribeTracking(socket, 'TMS-ABC123');

    expect(shipmentFindUnique).toHaveBeenCalledWith({
      where: { trackingCode: 'TMS-ABC123' },
      select: { id: true },
    });
    expect(join).toHaveBeenCalledWith('tracking:TMS-ABC123');
    expect(ack).toEqual({ ok: true });
  });

  it('acks not ok and does not join when the code does not exist', async () => {
    shipmentFindUnique.mockResolvedValue(null);

    const ack = await gateway.handleSubscribeTracking(socket, 'TMS-NOPE');

    expect(join).not.toHaveBeenCalled();
    expect(ack).toEqual({ ok: false });
  });

  it.each([
    undefined,
    '',
    42,
    { code: 'TMS-ABC123' },
  ])('acks not ok without querying for a non-string payload (%j)', async (payload) => {
    const ack = await gateway.handleSubscribeTracking(socket, payload);

    expect(shipmentFindUnique).not.toHaveBeenCalled();
    expect(join).not.toHaveBeenCalled();
    expect(ack).toEqual({ ok: false });
  });
});
