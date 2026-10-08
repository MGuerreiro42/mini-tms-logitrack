import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import {
  type CarrierUser,
  type DeliveryModality,
  type GlobalRole,
  PrismaClient,
  type Seller,
  ShipmentStatus,
} from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DEMO_PASSWORD = 'demo12345';

function resolveAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (password) return password;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD must be set when seeding in production');
  }
  return 'admin12345';
}

// Deterministic PRNG so every run plans the same demo data.
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(42);
const between = (min: number, max: number) => min + random() * (max - min);
const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(random() * items.length)];

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

async function seedSeller(
  email: string,
  companyName: string,
  document: string,
  modalities: DeliveryModality[],
  hash: string,
): Promise<Seller> {
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
  return seller;
}

async function seedCarrier(modalities: DeliveryModality[], hash: string) {
  const carrier = await prisma.carrier.upsert({
    where: { document: '98765432000199' },
    update: {},
    create: {
      companyName: 'Transportadora Demo',
      document: '98765432000199',
      status: 'APPROVED',
    },
  });

  const members = [
    { email: 'carrier@demo.minitms.dev', role: 'MANAGER' },
    { email: 'operator1@demo.minitms.dev', role: 'OPERATOR' },
    { email: 'operator2@demo.minitms.dev', role: 'OPERATOR' },
  ] as const;
  const carrierUsers: CarrierUser[] = [];
  for (const member of members) {
    const globalRole =
      member.role === 'MANAGER' ? 'CARRIER_MANAGER' : 'CARRIER_OPERATOR';
    const user = await upsertUser(member.email, globalRole, hash);
    carrierUsers.push(
      await prisma.carrierUser.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, carrierId: carrier.id, role: member.role },
      }),
    );
  }

  // Unique on (carrierId, state, city) doesn't dedupe a NULL city, so check first.
  const coversSp = await prisma.carrierCoverageArea.findFirst({
    where: { carrierId: carrier.id, state: 'SP', city: null },
  });
  if (!coversSp) {
    await prisma.carrierCoverageArea.create({
      data: { carrierId: carrier.id, state: 'SP', city: null },
    });
  }
  await prisma.carrierModality.createMany({
    data: modalities.map((m) => ({ carrierId: carrier.id, modalityId: m.id })),
    skipDuplicates: true,
  });

  return { carrier, carrierUsers };
}

const ADDRESSES = [
  ['Av. Paulista', '1000', 'Bela Vista', 'São Paulo', '01310-100'],
  ['Rua Augusta', '2340', 'Jardins', 'São Paulo', '01412-000'],
  ['Av. Brasil', '455', 'Jardim Guanabara', 'Campinas', '13070-178'],
  ['Rua XV de Novembro', '88', 'Centro', 'Santos', '11010-150'],
  ['Av. Itavuvu', '1200', 'Vila Olímpia', 'Sorocaba', '18078-005'],
  ['Rua General Osório', '310', 'Centro', 'Ribeirão Preto', '14010-000'],
  [
    'Av. São João',
    '760',
    'Jardim Esplanada',
    'São José dos Campos',
    '12242-000',
  ],
  ['Rua Dom Pedro II', '57', 'Centro', 'Guarulhos', '07011-000'],
] as const;

// Relative weight of each happy-path gap within a delivery's total duration.
const STAGE_WEIGHTS = [0.04, 0.2, 0.08, 0.55, 0.13];

interface ShipmentPlan {
  status: ShipmentStatus;
  late?: boolean;
  cancelledFrom?: ShipmentStatus;
}

const repeat = (count: number, plan: ShipmentPlan) =>
  Array.from({ length: count }, () => plan);

const { PENDING, ACCEPTED, COLLECTED, IN_TRANSIT, OUT_FOR_DELIVERY } =
  ShipmentStatus;
const { DELIVERED, FAILED_DELIVERY, RETURNED, CANCELLED } = ShipmentStatus;

const HAPPY_PATH: ShipmentStatus[] = [
  PENDING,
  ACCEPTED,
  COLLECTED,
  IN_TRANSIT,
  OUT_FOR_DELIVERY,
  DELIVERED,
];
const TERMINAL: ShipmentStatus[] = [DELIVERED, RETURNED, CANCELLED];
const pathUpTo = (status: ShipmentStatus) =>
  HAPPY_PATH.slice(0, HAPPY_PATH.indexOf(status) + 1);

// 40 shipments covering every status, 5 of them delivered past the SLA.
const PLANS: ShipmentPlan[] = [
  ...repeat(15, { status: DELIVERED }),
  ...repeat(5, { status: DELIVERED, late: true }),
  ...repeat(3, { status: RETURNED }),
  ...repeat(2, { status: FAILED_DELIVERY }),
  ...repeat(2, { status: CANCELLED, cancelledFrom: PENDING }),
  ...repeat(1, { status: CANCELLED, cancelledFrom: ACCEPTED }),
  ...repeat(3, { status: OUT_FOR_DELIVERY }),
  ...repeat(3, { status: IN_TRANSIT }),
  ...repeat(2, { status: COLLECTED }),
  ...repeat(2, { status: ACCEPTED }),
  ...repeat(2, { status: PENDING }),
];

const NOTES: Partial<Record<ShipmentStatus, string>> = {
  FAILED_DELIVERY: 'Recipient not at home',
  RETURNED: 'Returned to sender after failed attempts',
  CANCELLED: 'Order cancelled by the customer',
};

interface PlannedEvent {
  status: ShipmentStatus;
  at: Date;
}

// Gaps in hours for each happy-path stage, summing to `totalHours`.
function stageGaps(totalHours: number): number[] {
  const jittered = STAGE_WEIGHTS.map((weight) => weight * between(0.6, 1.4));
  const sum = jittered.reduce((a, b) => a + b, 0);
  return jittered.map((weight) => (weight / sum) * totalHours);
}

function planEvents(
  plan: ShipmentPlan,
  slaHours: number,
  now: number,
): PlannedEvent[] {
  const terminal = TERMINAL.includes(plan.status);
  const createdAt =
    now - (terminal ? between(4, 30) : between(0.1, 3)) * DAY_MS;

  let path: ShipmentStatus[];
  let gaps: number[];
  if (plan.status === CANCELLED) {
    path = [...pathUpTo(plan.cancelledFrom ?? PENDING), CANCELLED];
    gaps = path.slice(1).map(() => between(0.2, 20));
  } else if (plan.status === FAILED_DELIVERY || plan.status === RETURNED) {
    path = [...pathUpTo(OUT_FOR_DELIVERY), FAILED_DELIVERY];
    gaps = stageGaps(slaHours * between(0.5, 0.95));
    if (plan.status === RETURNED) {
      path.push(RETURNED);
      gaps.push(between(24, 96));
    }
  } else {
    const ratio = plan.late ? between(1.15, 1.8) : between(0.35, 0.9);
    path = pathUpTo(plan.status);
    gaps = stageGaps(slaHours * ratio).slice(0, path.length - 1);
  }

  // In-flight shipments must not have events in the future: compress to fit.
  const totalMs = gaps.reduce((a, b) => a + b, 0) * HOUR_MS;
  const available = now - createdAt - between(0.1, 2) * HOUR_MS;
  const scale = !terminal && totalMs > available ? available / totalMs : 1;

  let at = createdAt;
  return path.map((status, index) => {
    if (index > 0) at += gaps[index - 1] * HOUR_MS * scale;
    return { status, at: new Date(at) };
  });
}

// Fixed, hex-only codes keep the seed idempotent and match the generated format.
const demoTrackingCode = (index: number) =>
  `TMS-DE${String(index + 1).padStart(10, '0')}`;

async function seedShipments(
  sellers: Seller[],
  carrierId: string,
  carrierUsers: CarrierUser[],
  modalities: DeliveryModality[],
) {
  const [manager, operator1, operator2] = carrierUsers;
  // Uneven split so the operator ranking has a clear order.
  const owners = [
    operator1,
    operator1,
    operator1,
    operator2,
    operator2,
    manager,
  ];
  const [standard, full, express] = modalities;
  const modalityPool = [standard, standard, full, express];
  const now = Date.now();
  let created = 0;

  for (const [index, plan] of PLANS.entries()) {
    const seller = index % 3 === 2 ? sellers[1] : sellers[0];
    const modality = pick(modalityPool);
    const [street, number, neighborhood, city, zip] = pick(ADDRESSES);
    const events = planEvents(plan, modality.slaHours ?? 72, now);
    const owner = events.some((e) => e.status === ACCEPTED)
      ? pick(owners)
      : null;
    const trackingCode = demoTrackingCode(index);

    const exists = await prisma.shipment.findUnique({
      where: { trackingCode },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.shipment.create({
      data: {
        trackingCode,
        sellerId: seller.id,
        carrierId,
        modalityId: modality.id,
        ownerId: owner?.id ?? null,
        status: plan.status,
        addressStreet: street,
        addressNumber: number,
        addressNeighborhood: neighborhood,
        addressCity: city,
        addressState: 'SP',
        addressZipCode: zip,
        createdAt: events[0].at,
        updatedAt: events[events.length - 1].at,
        trackingEvents: {
          create: events.map((event) => ({
            status: event.status,
            note: NOTES[event.status] ?? null,
            createdAt: event.at,
          })),
        },
      },
    });
    created += 1;
  }

  console.log(
    `Demo shipments: ${created} created, ${PLANS.length - created} already present`,
  );
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@minitms.dev';
  const adminHash = await bcrypt.hash(resolveAdminPassword(), 10);
  const admin = await upsertUser(adminEmail, 'ADMIN', adminHash);
  console.log(`Admin seeded: ${admin.email}`);

  // Reference data: a fixed catalog with no admin CRUD screen.
  const modalities = await seedModalities();
  console.log(`Delivery modalities seeded: ${modalities.map((m) => m.code)}`);

  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const sellers = [
    await seedSeller(
      'seller@demo.minitms.dev',
      'Loja Demo',
      '12345678000100',
      modalities,
      demoHash,
    ),
    await seedSeller(
      'seller2@demo.minitms.dev',
      'Casa & Cia Demo',
      '23456789000111',
      modalities,
      demoHash,
    ),
  ];
  const { carrier, carrierUsers } = await seedCarrier(modalities, demoHash);
  console.log(
    `Demo accounts seeded: ${sellers.length} sellers, ${carrierUsers.length} carrier users`,
  );

  await seedShipments(sellers, carrier.id, carrierUsers, modalities);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
