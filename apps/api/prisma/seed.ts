import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import {
  type DeliveryModality,
  type GlobalRole,
  PrismaClient,
} from '../generated/prisma/client';
import {
  buildDemoShipments,
  DEMO_ADMIN,
  DEMO_CARRIER,
  DEMO_CARRIER_MEMBERS,
  DEMO_EXTRA_CARRIERS,
  DEMO_PASSWORD,
  DEMO_SELLERS,
  DEMO_STATE,
  type DemoTenant,
} from '../src/modules/simulator/demo-dataset';
import { cityKey } from '../src/shared/transforms/normalize';

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

async function upsertUser(
  email: string,
  name: string,
  role: GlobalRole,
  hash: string,
) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, passwordHash: hash, role },
  });
}

async function upsertCarrierUser(
  member: { email: string; name: string; role: 'MANAGER' | 'OPERATOR' },
  carrierId: string,
  hash: string,
) {
  const globalRole =
    member.role === 'MANAGER' ? 'CARRIER_MANAGER' : 'CARRIER_OPERATOR';
  const user = await upsertUser(member.email, member.name, globalRole, hash);
  return prisma.carrierUser.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, carrierId, role: member.role },
  });
}

// cities null covers the whole state.
async function seedCoverage(
  carrierId: string,
  cities: readonly string[] | null,
  state: string = DEMO_STATE,
) {
  if (cities) {
    await prisma.carrierCoverageArea.createMany({
      data: cities.map((city) => ({
        carrierId,
        state,
        city,
        cityKey: cityKey(city),
      })),
      skipDuplicates: true,
    });
    return;
  }
  // Unique on (carrierId, state, cityKey) doesn't dedupe a NULL city, so check first.
  const coversState = await prisma.carrierCoverageArea.findFirst({
    where: { carrierId, state, cityKey: null },
  });
  if (!coversState) {
    await prisma.carrierCoverageArea.create({
      data: { carrierId, state },
    });
  }
}

async function seedCarrierModalities(
  carrierId: string,
  modalities: DeliveryModality[],
) {
  await prisma.carrierModality.createMany({
    data: modalities.map((m) => ({ carrierId, modalityId: m.id })),
    skipDuplicates: true,
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
  const sellerUserIds: string[] = [];
  for (const { email, name, companyName, document } of DEMO_SELLERS) {
    const user = await upsertUser(email, name, 'SELLER', hash);
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
    sellerUserIds.push(user.id);
  }
  return { sellerIds, sellerUserIds };
}

async function seedCarrier(modalities: DeliveryModality[], hash: string) {
  const carrier = await prisma.carrier.upsert({
    where: { document: DEMO_CARRIER.document },
    update: {},
    create: { ...DEMO_CARRIER, status: 'APPROVED' },
  });

  const carrierUserIds = {} as DemoTenant['carrierUserIds'];
  const memberUserIds = {} as DemoTenant['memberUserIds'];
  for (const member of DEMO_CARRIER_MEMBERS) {
    const carrierUser = await upsertCarrierUser(member, carrier.id, hash);
    carrierUserIds[member.email] = carrierUser.id;
    memberUserIds[member.email] = carrierUser.userId;
  }

  await seedCoverage(carrier.id, null);
  await seedCarrierModalities(carrier.id, modalities);

  return { carrierId: carrier.id, carrierUserIds, memberUserIds };
}

async function seedExtraCarriers(modalities: DeliveryModality[], hash: string) {
  const extraCarriers: DemoTenant['extraCarriers'] = {};
  for (const extra of DEMO_EXTRA_CARRIERS) {
    const carrier = await prisma.carrier.upsert({
      where: { document: extra.document },
      update: {},
      create: {
        companyName: extra.companyName,
        document: extra.document,
        status: 'APPROVED',
      },
    });
    const manager = await upsertCarrierUser(
      { ...extra.manager, role: 'MANAGER' },
      carrier.id,
      hash,
    );
    extraCarriers[extra.companyName] = {
      carrierId: carrier.id,
      ownerId: manager.id,
      ownerUserId: manager.userId,
    };
    await seedCoverage(carrier.id, extra.cities);
    for (const state of extra.farStates) {
      await seedCoverage(carrier.id, null, state);
    }
    await seedCarrierModalities(
      carrier.id,
      modalities.filter((m) =>
        (extra.modalityCodes as readonly string[]).includes(m.code),
      ),
    );
  }
  return extraCarriers;
}

async function seedShipments(tenant: DemoTenant) {
  const shipments = buildDemoShipments(tenant, Date.now());
  const present = await prisma.shipment.findMany({
    where: {
      trackingCode: {
        in: shipments.map(({ shipment }) => shipment.trackingCode),
      },
    },
    select: { trackingCode: true },
  });
  const presentCodes = new Set(present.map((s) => s.trackingCode));
  const missing = shipments
    .filter(({ shipment }) => !presentCodes.has(shipment.trackingCode))
    .map((demo) => ({ ...demo, id: randomUUID() }));

  // Batched as in the daily reset: one statement per table.
  await prisma.$transaction([
    prisma.shipment.createMany({
      data: missing.map(({ id, shipment }) => ({ ...shipment, id })),
    }),
    prisma.trackingEvent.createMany({
      data: missing.flatMap(({ id, events }) =>
        events.map((event) => ({ ...event, shipmentId: id })),
      ),
    }),
  ]);

  console.log(
    `Demo shipments: ${missing.length} created, ${presentCodes.size} already present`,
  );
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@minitms.dev';
  if (adminEmail === DEMO_ADMIN.email) {
    throw new Error(
      'ADMIN_EMAIL must differ from the demo admin, whose password is public',
    );
  }
  const adminHash = await bcrypt.hash(resolveAdminPassword(), 10);
  const admin = await upsertUser(adminEmail, 'Admin', 'ADMIN', adminHash);
  console.log(`Admin seeded: ${admin.email}`);

  const modalities = await seedModalities();
  console.log(`Delivery modalities seeded: ${modalities.map((m) => m.code)}`);

  if (process.env.SEED_DEMO !== 'true') {
    console.log('Demo data skipped (set SEED_DEMO=true to seed it)');
    return;
  }

  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const sellers = await seedSellers(modalities, demoHash);
  const carrier = await seedCarrier(modalities, demoHash);
  const extraCarriers = await seedExtraCarriers(modalities, demoHash);
  await upsertUser(DEMO_ADMIN.email, DEMO_ADMIN.name, 'ADMIN', demoHash);
  console.log(
    `Demo accounts seeded: ${sellers.sellerIds.length} sellers, ${1 + DEMO_EXTRA_CARRIERS.length} carriers`,
  );

  const [standard, full, express] = modalities;
  await seedShipments({
    ...sellers,
    ...carrier,
    extraCarriers,
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
