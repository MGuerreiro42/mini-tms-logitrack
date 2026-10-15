import { randomBytes } from 'node:crypto';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';

function generateTrackingCode(): string {
  return `TMS-${randomBytes(6).toString('hex').toUpperCase()}`;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@minitms.dev';
  const password = process.env.ADMIN_PASSWORD ?? 'admin12345';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Admin seeded: ${admin.email}`);

  // DeliveryModality is reference data (DESIGN.md § 10) — a fixed catalog,
  // not something an admin CRUDs through a screen (none is speced), so it's
  // seeded rather than exposed via a write endpoint.
  const modalities = [
    { code: 'STANDARD', name: 'Standard', slaHours: 72 },
    { code: 'FULL', name: 'Full', slaHours: 48 },
    { code: 'EXPRESS', name: 'Express', slaHours: 24 },
  ];

  for (const modality of modalities) {
    await prisma.deliveryModality.upsert({
      where: { code: modality.code },
      update: {},
      create: modality,
    });
  }

  console.log(
    `Delivery modalities seeded: ${modalities.map((m) => m.code).join(', ')}`,
  );

  const standardModality = await prisma.deliveryModality.findUniqueOrThrow({
    where: { code: 'STANDARD' },
  });

  const demoPasswordHash = await bcrypt.hash('demo12345', 10);

  const sellerUser = await prisma.user.upsert({
    where: { email: 'seller@demo.minitms.dev' },
    update: {},
    create: {
      email: 'seller@demo.minitms.dev',
      passwordHash: demoPasswordHash,
      role: 'SELLER',
    },
  });
  const seller = await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      companyName: 'Loja Demo',
      document: '12345678000100',
      status: 'APPROVED',
    },
  });
  await prisma.sellerModality.upsert({
    where: {
      sellerId_modalityId: {
        sellerId: seller.id,
        modalityId: standardModality.id,
      },
    },
    update: {},
    create: { sellerId: seller.id, modalityId: standardModality.id },
  });

  const carrierManagerUser = await prisma.user.upsert({
    where: { email: 'carrier@demo.minitms.dev' },
    update: {},
    create: {
      email: 'carrier@demo.minitms.dev',
      passwordHash: demoPasswordHash,
      role: 'CARRIER_MANAGER',
    },
  });
  const carrier = await prisma.carrier.upsert({
    where: { document: '98765432000199' },
    update: {},
    create: {
      companyName: 'Transportadora Demo',
      document: '98765432000199',
      status: 'APPROVED',
    },
  });
  const carrierManager = await prisma.carrierUser.upsert({
    where: { userId: carrierManagerUser.id },
    update: {},
    create: {
      userId: carrierManagerUser.id,
      carrierId: carrier.id,
      role: 'MANAGER',
    },
  });
  const existingCoverageArea = await prisma.carrierCoverageArea.findFirst({
    where: { carrierId: carrier.id, state: 'SP', city: null },
  });
  if (!existingCoverageArea) {
    await prisma.carrierCoverageArea.create({
      data: { carrierId: carrier.id, state: 'SP', city: null },
    });
  }
  await prisma.carrierModality.upsert({
    where: {
      carrierId_modalityId: {
        carrierId: carrier.id,
        modalityId: standardModality.id,
      },
    },
    update: {},
    create: { carrierId: carrier.id, modalityId: standardModality.id },
  });

  console.log(
    `Demo seller/carrier seeded: ${seller.companyName} / ${carrier.companyName}`,
  );

  const demoAddress = {
    addressStreet: 'Av. Paulista',
    addressNumber: '1000',
    addressNeighborhood: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressZipCode: '01310-100',
  };

  const existingDemoShipments = await prisma.shipment.count({
    where: { sellerId: seller.id },
  });

  if (existingDemoShipments === 0) {
    const shipmentPlans: {
      status:
        | 'PENDING'
        | 'ACCEPTED'
        | 'COLLECTED'
        | 'OUT_FOR_DELIVERY'
        | 'DELIVERED';
      owned: boolean;
    }[] = [
      { status: 'PENDING', owned: false },
      { status: 'ACCEPTED', owned: true },
      { status: 'COLLECTED', owned: true },
      { status: 'OUT_FOR_DELIVERY', owned: true },
      { status: 'DELIVERED', owned: true },
    ];

    for (const plan of shipmentPlans) {
      const shipment = await prisma.shipment.create({
        data: {
          trackingCode: generateTrackingCode(),
          sellerId: seller.id,
          carrierId: carrier.id,
          modalityId: standardModality.id,
          ownerId: plan.owned ? carrierManager.id : null,
          status: plan.status,
          ...demoAddress,
        },
      });

      const history: ShipmentStatusHistory = STATUS_HISTORY[plan.status];
      for (const status of history) {
        await prisma.trackingEvent.create({
          data: { shipmentId: shipment.id, status },
        });
      }
    }

    console.log(`Demo shipments seeded: ${shipmentPlans.length}`);
  } else {
    console.log('Demo shipments already exist, skipping.');
  }
}

type ShipmentStatusHistory = (
  | 'PENDING'
  | 'ACCEPTED'
  | 'COLLECTED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
)[];

const STATUS_HISTORY: Record<
  'PENDING' | 'ACCEPTED' | 'COLLECTED' | 'OUT_FOR_DELIVERY' | 'DELIVERED',
  ShipmentStatusHistory
> = {
  PENDING: ['PENDING'],
  ACCEPTED: ['PENDING', 'ACCEPTED'],
  COLLECTED: ['PENDING', 'ACCEPTED', 'COLLECTED'],
  OUT_FOR_DELIVERY: ['PENDING', 'ACCEPTED', 'COLLECTED', 'OUT_FOR_DELIVERY'],
  DELIVERED: [
    'PENDING',
    'ACCEPTED',
    'COLLECTED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ],
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
