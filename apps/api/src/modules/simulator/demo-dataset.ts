import { type Prisma, ShipmentStatus } from '../../../generated/prisma/client';
import { MS_PER_HOUR } from '../../shared/stats/stats';
import { computeDueAt } from '../shipments/shipment-due-at';
import { STAGE_DURATION_MS } from './simulator.constants';

export const DEMO_STATE = 'SP';
export const DEMO_PASSWORD = 'demo12345';

export const DEMO_SELLERS = [
  {
    email: 'seller@demo.minitms.dev',
    name: 'Lucas Pereira',
    companyName: 'Loja Demo',
    document: '12345678000100',
  },
  {
    email: 'seller2@demo.minitms.dev',
    name: 'Marina Costa',
    companyName: 'Casa & Cia Demo',
    document: '23456789000111',
  },
] as const;

// A platform admin whose password is public: it reads every tenant but never decides a
// sign-up (spec 08 FR-002). Kept out of DEMO_EMAILS, which loads the demo tenant.
export const DEMO_ADMIN = {
  email: 'admin@demo.minitms.dev',
  name: 'Demo admin',
} as const;

export const DEMO_CARRIER = {
  companyName: 'Transportadora Demo',
  document: '98765432000199',
} as const;

export const DEMO_CARRIER_MEMBERS = [
  { email: 'carrier@demo.minitms.dev', name: 'Carlos Mendes', role: 'MANAGER' },
  { email: 'operator1@demo.minitms.dev', name: 'Ana Souza', role: 'OPERATOR' },
  { email: 'operator2@demo.minitms.dev', name: 'Bruno Lima', role: 'OPERATOR' },
] as const;

export const DEMO_MODALITY_CODES = ['STANDARD', 'FULL', 'EXPRESS'] as const;
type DemoModalityCode = (typeof DEMO_MODALITY_CODES)[number];

// So the carrier choice at shipment creation is a real one; null cities cover the whole state.
export const DEMO_EXTRA_CARRIERS: readonly {
  companyName: string;
  document: string;
  manager: { email: string; name: string };
  cities: readonly string[] | null;
  modalityCodes: readonly DemoModalityCode[];
}[] = [
  {
    companyName: 'Rápido Paulista',
    document: '11222333000181',
    manager: { email: 'rapido@demo.minitms.dev', name: 'Rafael Alves' },
    cities: ['São Paulo', 'Guarulhos', 'Campinas', 'Santos'],
    modalityCodes: ['EXPRESS', 'FULL'],
  },
  {
    companyName: 'EconoLog',
    document: '44555666000181',
    manager: { email: 'econolog@demo.minitms.dev', name: 'Juliana Rocha' },
    cities: null,
    modalityCodes: ['STANDARD', 'FULL'],
  },
];

export const DEMO_ADDRESSES = [
  {
    street: 'Av. Paulista',
    number: '1000',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    zipCode: '01310100',
  },
  {
    street: 'Rua Augusta',
    number: '2340',
    neighborhood: 'Jardins',
    city: 'São Paulo',
    zipCode: '01412000',
  },
  {
    street: 'Av. Brasil',
    number: '455',
    neighborhood: 'Jardim Guanabara',
    city: 'Campinas',
    zipCode: '13070178',
  },
  {
    street: 'Rua XV de Novembro',
    number: '88',
    neighborhood: 'Centro',
    city: 'Santos',
    zipCode: '11010150',
  },
  {
    street: 'Av. Itavuvu',
    number: '1200',
    neighborhood: 'Vila Olímpia',
    city: 'Sorocaba',
    zipCode: '18078005',
  },
  {
    street: 'Rua General Osório',
    number: '310',
    neighborhood: 'Centro',
    city: 'Ribeirão Preto',
    zipCode: '14010000',
  },
  {
    street: 'Av. São João',
    number: '760',
    neighborhood: 'Jardim Esplanada',
    city: 'São José dos Campos',
    zipCode: '12242000',
  },
  {
    street: 'Rua Dom Pedro II',
    number: '57',
    neighborhood: 'Centro',
    city: 'Guarulhos',
    zipCode: '07011000',
  },
] as const;

export const STATUS_NOTES: Partial<Record<ShipmentStatus, string>> = {
  FAILED_DELIVERY: 'Recipient not at home',
  RETURNED: 'Returned to sender after failed attempts',
  CANCELLED: 'Order cancelled by the customer',
};

export const DEMO_EMAILS = [
  ...DEMO_SELLERS.map((seller) => seller.email),
  ...DEMO_CARRIER_MEMBERS.map((member) => member.email),
  ...DEMO_EXTRA_CARRIERS.map((carrier) => carrier.manager.email),
];

type DemoAddress = (typeof DEMO_ADDRESSES)[number];

export const toAddressFields = (address: DemoAddress) => ({
  addressStreet: address.street,
  addressNumber: address.number,
  addressNeighborhood: address.neighborhood,
  addressCity: address.city,
  addressState: DEMO_STATE,
  addressZipCode: address.zipCode,
});

export const DEMO_TRACKING_PREFIX = 'TMS-DE';

type DemoMemberEmail = (typeof DEMO_CARRIER_MEMBERS)[number]['email'];

export interface DemoTenant {
  sellerIds: readonly string[];
  sellerUserIds: readonly string[];
  carrierId: string;
  carrierUserIds: Record<DemoMemberEmail, string>;
  memberUserIds: Record<DemoMemberEmail, string>;
  modalities: Record<DemoModalityCode, { id: string; slaHours: number | null }>;
}

const DAY_MS = 24 * MS_PER_HOUR;
const DEFAULT_SLA_HOURS = 72;
const STAGE_WEIGHTS = [0.04, 0.2, 0.08, 0.55, 0.13];
const MODALITY_POOL: DemoModalityCode[] = [
  'STANDARD',
  'STANDARD',
  'FULL',
  'EXPRESS',
];
const OWNER_POOL: DemoMemberEmail[] = [
  'operator1@demo.minitms.dev',
  'operator1@demo.minitms.dev',
  'operator1@demo.minitms.dev',
  'operator2@demo.minitms.dev',
  'operator2@demo.minitms.dev',
  'carrier@demo.minitms.dev',
];

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

interface ShipmentPlan {
  status: ShipmentStatus;
  late?: boolean;
  cancelledFrom?: ShipmentStatus;
}

const repeat = (count: number, plan: ShipmentPlan) =>
  Array.from({ length: count }, () => plan);

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

export const DEMO_SHIPMENT_COUNT = PLANS.length;

interface PlannedEvent {
  status: ShipmentStatus;
  at: Date;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class SeededRandom {
  private readonly next = mulberry32(42);

  between(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

function stageGaps(random: SeededRandom, totalHours: number): number[] {
  const jittered = STAGE_WEIGHTS.map(
    (weight) => weight * random.between(0.6, 1.4),
  );
  const sum = jittered.reduce((a, b) => a + b, 0);
  return jittered.map((weight) => (weight / sum) * totalHours);
}

function planEvents(
  random: SeededRandom,
  plan: ShipmentPlan,
  slaHours: number,
  now: number,
): PlannedEvent[] {
  const terminal = TERMINAL.includes(plan.status);
  const createdAt =
    now - (terminal ? random.between(4, 30) : random.between(0.1, 3)) * DAY_MS;

  let path: ShipmentStatus[];
  let gaps: number[];
  if (plan.status === CANCELLED) {
    path = [...pathUpTo(plan.cancelledFrom ?? PENDING), CANCELLED];
    gaps = path.slice(1).map(() => random.between(0.2, 20));
  } else if (plan.status === FAILED_DELIVERY || plan.status === RETURNED) {
    path = [...pathUpTo(OUT_FOR_DELIVERY), FAILED_DELIVERY];
    gaps = stageGaps(random, slaHours * random.between(0.5, 0.95));
    if (plan.status === RETURNED) {
      path.push(RETURNED);
      gaps.push(random.between(24, 96));
    }
  } else {
    const ratio = plan.late
      ? random.between(1.15, 1.8)
      : random.between(0.35, 0.9);
    path = pathUpTo(plan.status);
    gaps = stageGaps(random, slaHours * ratio).slice(0, path.length - 1);
  }

  const totalMs = gaps.reduce((a, b) => a + b, 0) * MS_PER_HOUR;
  const available = now - createdAt - random.between(0.1, 2) * MS_PER_HOUR;
  const scale = !terminal && totalMs > available ? available / totalMs : 1;

  let at = createdAt;
  const events = path.map((status, index) => {
    if (index > 0) at += gaps[index - 1] * MS_PER_HOUR * scale;
    return { status, at: new Date(at) };
  });
  // A road stage is driven live (spec 03): start the vehicle somewhere along it, not at its end.
  const stageMs = STAGE_DURATION_MS[plan.status];
  if (stageMs) {
    events[events.length - 1].at = new Date(now - random.between(0, stageMs));
  }
  return events;
}

const demoTrackingCode = (index: number) =>
  `${DEMO_TRACKING_PREFIX}${String(index + 1).padStart(10, '0')}`;

export interface DemoShipment {
  shipment: Prisma.ShipmentCreateManyInput & { createdAt: Date };
  events: (Omit<Prisma.TrackingEventCreateManyInput, 'shipmentId'> & {
    createdAt: Date;
  })[];
}

// Seeded, so the seed script and the daily reset always rebuild the same shipments.
export function buildDemoShipments(
  tenant: DemoTenant,
  now: number,
): DemoShipment[] {
  const random = new SeededRandom();

  return PLANS.map((plan, index) => {
    const sellerIndex = index % 3 === 2 ? 1 : 0;
    const modality = tenant.modalities[random.pick(MODALITY_POOL)];
    const address = random.pick(DEMO_ADDRESSES);
    const events = planEvents(
      random,
      plan,
      modality.slaHours ?? DEFAULT_SLA_HOURS,
      now,
    );
    const owner = events.some((e) => e.status === ACCEPTED)
      ? random.pick(OWNER_POOL)
      : null;
    const createdAt = events[0].at;

    return {
      shipment: {
        trackingCode: demoTrackingCode(index),
        sellerId: tenant.sellerIds[sellerIndex],
        carrierId: tenant.carrierId,
        modalityId: modality.id,
        ownerId: owner && tenant.carrierUserIds[owner],
        status: plan.status,
        ...toAddressFields(address),
        createdAt,
        updatedAt: events[events.length - 1].at,
        dueAt: computeDueAt(createdAt, modality.slaHours),
        deliveredAt: events.find((e) => e.status === DELIVERED)?.at ?? null,
      },
      events: events.map((event) => ({
        status: event.status,
        note: STATUS_NOTES[event.status] ?? null,
        // The seller opens and cancels; every carrier step is the owner's.
        actorId:
          event.status === PENDING || event.status === CANCELLED || !owner
            ? tenant.sellerUserIds[sellerIndex]
            : tenant.memberUserIds[owner],
        createdAt: event.at,
      })),
    };
  });
}
