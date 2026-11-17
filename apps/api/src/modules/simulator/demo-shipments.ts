import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../../generated/prisma/client';
import { buildDemoShipments, type DemoTenant } from './demo-dataset';

// Shared by the daily reset and the seed, so an older demo dataset converges to the current one.
export async function replaceDemoShipments(
  prisma: PrismaClient,
  tenant: DemoTenant,
): Promise<number> {
  // By seller alone: visitor-created shipments on the demo accounts go too, whatever carrier they picked.
  const demoSellerShipments = { sellerId: { in: [...tenant.sellerIds] } };
  const shipments = buildDemoShipments(tenant, Date.now()).map((demo) => ({
    ...demo,
    id: randomUUID(),
  }));
  // Ids are generated here so the whole replacement is four statements in one batch.
  await prisma.$transaction([
    prisma.trackingEvent.deleteMany({
      where: { shipment: demoSellerShipments },
    }),
    prisma.shipment.deleteMany({ where: demoSellerShipments }),
    prisma.shipment.createMany({
      data: shipments.map(({ id, shipment }) => ({ ...shipment, id })),
    }),
    prisma.trackingEvent.createMany({
      data: shipments.flatMap(({ id, events }) =>
        events.map((event) => ({ ...event, shipmentId: id })),
      ),
    }),
  ]);
  return shipments.length;
}
