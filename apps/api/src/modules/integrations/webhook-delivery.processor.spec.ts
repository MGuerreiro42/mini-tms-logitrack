import { Test } from '@nestjs/testing';
import type { Job } from 'bullmq';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
import { WebhookDispatcher } from './webhook-dispatcher';
import { WebhookInboxService } from './webhook-inbox.service';
import {
  type DeliverJobData,
  MAX_ATTEMPTS,
  retryDelayMs,
} from './webhook-queue';
import { generateWebhookSecret } from './webhook-signature';

describe('WebhookDeliveryProcessor', () => {
  let processor: WebhookDeliveryProcessor;
  const findUnique = vi.fn();
  const update = vi.fn();
  const receive = vi.fn();
  const isInboxUrl = vi.fn();
  const emitUpdated = vi.fn();

  const delivery = (overrides: object = {}, endpoint: object = {}) => ({
    id: 'delivery-1',
    status: 'PENDING',
    payload: { type: 'shipment.created' },
    endpoint: {
      sellerId: 'seller-1',
      active: true,
      url: 'https://inbox.example/webhook-inbox/inbox-1',
      inboxId: 'inbox-1',
      secret: generateWebhookSecret(),
      ...endpoint,
    },
    ...overrides,
  });
  const job = (attemptsMade = 0) =>
    ({
      attemptsMade,
      data: { deliveryId: 'delivery-1' },
    }) as Job<DeliverJobData>;
  const recorded = () => update.mock.calls[0][0];

  beforeEach(async () => {
    vi.resetAllMocks();
    update.mockImplementation(({ data }) => ({ id: 'delivery-1', ...data }));
    isInboxUrl.mockReturnValue(true);
    const moduleRef = await Test.createTestingModule({
      providers: [
        WebhookDeliveryProcessor,
        {
          provide: PrismaService,
          useValue: { webhookDelivery: { findUnique, update } },
        },
        { provide: WebhookInboxService, useValue: { receive, isInboxUrl } },
        { provide: WebhookDispatcher, useValue: { emitUpdated } },
      ],
    }).compile();
    processor = moduleRef.get(WebhookDeliveryProcessor);
  });

  it('retries after 10 s, 30 s, 90 s, 270 s and 810 s', () => {
    expect([1, 2, 3, 4, 5].map(retryDelayMs)).toEqual([
      10_000, 30_000, 90_000, 270_000, 810_000,
    ]);
  });

  it.each([
    ['deleted', null],
    ['no longer pending', delivery({ status: 'FAILED' })],
  ])('skips a delivery that is %s', async (_, row) => {
    findUnique.mockResolvedValue(row);

    await processor.process(job());

    expect(update).not.toHaveBeenCalled();
    expect(receive).not.toHaveBeenCalled();
  });

  it('fails a delivery of a disabled endpoint without retrying', async () => {
    findUnique.mockResolvedValue(delivery({}, { active: false }));

    await expect(processor.process(job())).resolves.toBeUndefined();

    expect(recorded().data).toMatchObject({
      status: 'FAILED',
      error: 'Endpoint disabled',
    });
    expect(receive).not.toHaveBeenCalled();
  });

  it('signs the payload and records a 2xx as succeeded', async () => {
    findUnique.mockResolvedValue(delivery());
    receive.mockResolvedValue(200);

    await processor.process(job());

    const [, headers, body] = receive.mock.calls[0];
    expect(body).toBe('{"type":"shipment.created"}');
    expect(headers).toMatchObject({ 'webhook-id': 'delivery-1' });
    expect(headers['webhook-signature']).toMatch(/^v1,/);
    expect(recorded()).toMatchObject({
      where: { id: 'delivery-1', status: 'PENDING' },
      data: {
        status: 'SUCCEEDED',
        attempts: 1,
        responseCode: 200,
        error: null,
      },
    });
    expect(emitUpdated).toHaveBeenCalledWith('seller-1', expect.anything());
  });

  it('keeps a failed attempt pending and throws, so BullMQ retries it', async () => {
    findUnique.mockResolvedValue(delivery());
    receive.mockResolvedValue(500);
    const before = Date.now();

    await expect(processor.process(job(2))).rejects.toThrow('HTTP 500');

    const { data } = recorded();
    expect(data).toMatchObject({
      status: 'PENDING',
      attempts: 3,
      error: 'HTTP 500',
    });
    expect(data.nextAttemptAt.getTime() - before).toBeGreaterThanOrEqual(
      retryDelayMs(3),
    );
  });

  it('fails for good on the last attempt, without throwing', async () => {
    findUnique.mockResolvedValue(delivery());
    receive.mockResolvedValue(503);

    await processor.process(job(MAX_ATTEMPTS - 1));

    expect(recorded().data).toMatchObject({
      status: 'FAILED',
      attempts: MAX_ATTEMPTS,
      nextAttemptAt: null,
    });
  });

  it('checks a remote URL before every attempt and records why it was refused', async () => {
    isInboxUrl.mockReturnValue(false);
    findUnique.mockResolvedValue(
      delivery({}, { url: 'https://169.254.169.254/latest' }),
    );

    await expect(processor.process(job())).rejects.toThrow('public address');

    expect(recorded().data).toMatchObject({
      status: 'PENDING',
      responseCode: null,
    });
    expect(receive).not.toHaveBeenCalled();
  });
});
