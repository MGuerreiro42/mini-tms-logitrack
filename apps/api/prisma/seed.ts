import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import {
  type DeliveryModality,
  type GlobalRole,
  PrismaClient,
} from '../generated/prisma/client';
import {
  buildDemoShipments,
  DEMO_CARRIER,
  DEMO_CARRIER_MEMBERS,
  DEMO_PASSWORD,
  DEMO_SELLERS,
  DEMO_STATE,
  type DemoTenant,
} from '../src/modules/simulator/demo-dataset';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function resolveAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (password) return password;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD must be set when seeding in production');
  }
  return 'admin12345';
}

async function upsertUser(email: string, role: GlobalRole, hash: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: hash, role },
  });
}

async function seedModalities(): Promise<DeliveryModality[]> {
  const catalog = [
    { code: 'STANDARD', name: 'Standard', slaHours: 72 },
    { code: 'FULL', name: 'Full', slaHours: 48 },
    { code: 'EXPRESS', name: 'Express', slaHours: 24 },
  ];
  return Promise.all(
    catalog.map((modality) =>
      prisma.deliveryModality.upsert({
        where: { code: modality.code },
        update: {},
        create: modality,
      }),
    ),
  );
}

async function seedSellers(modalities: DeliveryModality[], hash: string) {
  const sellerIds: string[] = [];
  for (const { email, companyName, document } of DEMO_SELLERS) {
    const user = await upsertUser(email, 'SELLER', hash);
    const seller = await prisma.seller.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, companyName, document, status: 'APPROVED' },
    });
    await prisma.sellerModality.createMany({
      data: modalities.map((m) => ({ sellerId: seller.id, modalityId: m.id })),
      skipDuplicates: true,
    });
    sellerIds.push(seller.id);
  }
  return sellerIds;
}

async function seedCarrier(modalities: DeliveryModality[], hash: string) {
  const carrier = await prisma.carrier.upsert({
    where: { document: DEMO_CARRIER.document },
    update: {},
    create: { ...DEMO_CARRIER, status: 'APPROVED' },
  });

  const carrierUserIds = {} as DemoTenant['carrierUserIds'];
  for (const member of DEMO_CARRIER_MEMBERS) {
    const globalRole =
      member.role === 'MANAGER' ? 'CARRIER_MANAGER' : 'CARRIER_OPERATOR';
    const user = await upsertUser(member.email, globalRole, hash);
    const carrierUser = await prisma.carrierUser.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, carrierId: carrier.id, role: member.role },
    });
    carrierUserIds[member.email] = carrierUser.id;
  }

  // Unique on (carrierId, state, city) doesn't dedupe a NULL city, so check first.
  const coversState = await prisma.carrierCoverageArea.findFirst({
    where: { carrierId: carrier.id, state: DEMO_STATE, city: null },
  });
  if (!coversState) {
    await prisma.carrierCoverageArea.create({
      data: { carrierId: carrier.id, state: DEMO_STATE, city: null },
    });
  }
  await prisma.carrierModality.createMany({
    data: modalities.map((m) => ({ carrierId: carrier.id, modalityId: m.id })),
    skipDuplicates: true,
  });

  return { carrierId: carrier.id, carrierUserIds };
}

async function seedShipments(tenant: DemoTenant) {
  const shipments = buildDemoShipments(tenant, Date.now());
  let created = 0;

  for (const { shipment, events } of shipments) {
    const exists = await prisma.shipment.findUnique({
      where: { trackingCode: shipment.trackingCode },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.shipment.create({
      data: { ...shipment, trackingEvents: { create: events } },
    });
    created += 1;
  }

  console.log(
    `Demo shipments: ${created} created, ${shipments.length - created} already present`,
  );
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@minitms.dev';
  const adminHash = await bcrypt.hash(resolveAdminPassword(), 10);
  const admin = await upsertUser(adminEmail, 'ADMIN', adminHash);
  console.log(`Admin seeded: ${admin.email}`);

  const modalities = await seedModalities();
  console.log(`Delivery modalities seeded: ${modalities.map((m) => m.code)}`);

  if (process.env.SEED_DEMO !== 'true') {
    console.log('Demo data skipped (set SEED_DEMO=true to seed it)');
    return;
  }

  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const sellerIds = await seedSellers(modalities, demoHash);
  const { carrierId, carrierUserIds } = await seedCarrier(modalities, demoHash);
  console.log(
    `Demo accounts seeded: ${sellerIds.length} sellers, ${DEMO_CARRIER_MEMBERS.length} carrier users`,
  );

  const [standard, full, express] = modalities;
  await seedShipments({
    sellerIds,
    carrierId,
    carrierUserIds,
    modalities: { STANDARD: standard, FULL: full, EXPRESS: express },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
