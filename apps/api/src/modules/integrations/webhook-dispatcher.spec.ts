import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WebhookDispatcher } from './webhook-dispatcher';
import { WebhookInboxService } from './webhook-inbox.service';
import { WEBHOOKS_QUEUE } from './webhook-queue';

const existing = {
  id: 'endpoint-1',
  inboxId: 'inbox-1',
  url: 'http://inbox/inbox-1',
  events: ['SHIPMENT_CREATED', 'SHIPMENT_STATUS_CHANGED'],
  active: true,
  secret: 'whsec_x',
};

const shipmentCreated = {
  shipmentId: 'shipment-1',
  carrierId: 'carrier-1',
  sellerId: 'seller-1',
  status: 'PENDING' as const,
  previousStatus: null,
  trackingCode: 'TMS-ABC',
};

describe('WebhookDispatcher', () => {
  let dispatcher: WebhookDispatcher;
  const prisma = {
    webhookEndpoint: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    webhookDelivery: { create: vi.fn() },
  };
  const fresh = {
    inboxId: 'inbox-new',
    url: 'http://inbox/inbox-new',
    events: ['SHIPMENT_CREATED', 'SHIPMENT_STATUS_CHANGED'],
    secret: 'whsec_new',
  };
  const inbox = { freshEndpoint: vi.fn(() => fresh) };
  const queue = { add: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.webhookDelivery.create.mockResolvedValue({
      id: 'delivery-1',
      createdAt: new Date(),
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        WebhookDispatcher,
        { provide: PrismaService, useValue: prisma },
        { provide: WebhookInboxService, useValue: inbox },
        { provide: EventEmitter2, useValue: { emit: vi.fn() } },
        { provide: getQueueToken(WEBHOOKS_QUEUE), useValue: queue },
      ],
    }).compile();
    dispatcher = moduleRef.get(WebhookDispatcher);
  });

  it('provisions an active endpoint on its own inbox for a seller without one', async () => {
    prisma.webhookEndpoint.findUnique.mockResolvedValue(null);
    prisma.webhookEndpoint.create.mockImplementation(({ data }) => ({
      id: 'endpoint-new',
      active: true,
      ...data,
    }));

    await dispatcher.handleShipmentUpdated(shipmentCreated);

    expect(prisma.webhookEndpoint.create).toHaveBeenCalledWith({
      data: { sellerId: 'seller-1', ...fresh },
    });
    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        endpointId: 'endpoint-new',
        event: 'SHIPMENT_CREATED',
      }),
    });
    expect(queue.add).toHaveBeenCalled();
  });

  it('leaves a disabled endpoint disabled and delivers nothing', async () => {
    prisma.webhookEndpoint.findUnique.mockResolvedValue({
      ...existing,
      active: false,
    });

    await dispatcher.handleShipmentUpdated(shipmentCreated);

    expect(prisma.webhookEndpoint.create).not.toHaveBeenCalled();
    expect(prisma.webhookDelivery.create).not.toHaveBeenCalled();
  });

  it('returns the endpoint a concurrent first event or visit created', async () => {
    prisma.webhookEndpoint.findUnique.mockResolvedValue(null);
    prisma.webhookEndpoint.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['sellerId'] },
      }),
    );
    prisma.webhookEndpoint.findUniqueOrThrow.mockResolvedValue(existing);

    await expect(dispatcher.findOrCreateEndpoint('seller-1')).resolves.toBe(
      existing,
    );
    expect(prisma.webhookEndpoint.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { sellerId: 'seller-1' },
    });
  });
});
