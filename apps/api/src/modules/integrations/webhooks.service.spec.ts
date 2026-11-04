import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WebhookDispatcher } from './webhook-dispatcher';
import { WebhookInboxService } from './webhook-inbox.service';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let webhooksService: WebhooksService;
  const prisma = {
    seller: { findUnique: vi.fn() },
    webhookEndpoint: { create: vi.fn(), findUniqueOrThrow: vi.fn() },
  };
  const inbox = { urlFor: vi.fn((id: string) => `http://inbox/${id}`) };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: WebhookInboxService, useValue: inbox },
        { provide: WebhookDispatcher, useValue: {} },
      ],
    }).compile();
    webhooksService = module.get(WebhooksService);
  });

  it('returns the endpoint a concurrent first visit created', async () => {
    const existing = {
      id: 'endpoint-1',
      inboxId: 'inbox-1',
      url: 'http://inbox/inbox-1',
      events: [],
      active: true,
      secret: 'whsec_x',
    };
    prisma.seller.findUnique.mockResolvedValue({
      id: 'seller-1',
      webhookEndpoint: null,
    });
    prisma.webhookEndpoint.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['sellerId'] },
      }),
    );
    prisma.webhookEndpoint.findUniqueOrThrow.mockResolvedValue(existing);

    await expect(webhooksService.getEndpoint('user-1')).resolves.toMatchObject({
      url: existing.url,
      secret: existing.secret,
    });
    expect(prisma.webhookEndpoint.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { sellerId: 'seller-1' },
    });
  });
});
