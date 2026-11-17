import type { PrismaClient } from '../../../generated/prisma/client';
import type { freshInboxEndpoint } from './webhook-inbox.service';

export interface DemoInbox {
  clear(inboxIds: string[]): Promise<void>;
  freshEndpoint(): ReturnType<typeof freshInboxEndpoint>;
}

// Shared by the daily reset and the seed. Errors propagate: the reset job is retried, the seed fails the deploy.
export async function resetDemoWebhooks(
  prisma: PrismaClient,
  inbox: DemoInbox,
  sellerIds: readonly string[],
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { sellerId: { in: [...sellerIds] } },
  });
  await inbox.clear(endpoints.map((endpoint) => endpoint.inboxId));
  await prisma.$transaction([
    prisma.webhookDelivery.deleteMany({
      where: { endpoint: { sellerId: { in: [...sellerIds] } } },
    }),
    prisma.apiKey.deleteMany({ where: { sellerId: { in: [...sellerIds] } } }),
    // Fresh inbox id and secret: the demo password is public, so yesterday's visitors knew both.
    ...endpoints.map((endpoint) =>
      prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: { ...inbox.freshEndpoint(), active: true },
      }),
    ),
  ]);
}
