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

// So the carrier choice at shipment creation is a real one; null cities cover the whole of SP,
// farStates are covered whole.
export const DEMO_EXTRA_CARRIERS = [
  {
    companyName: 'Rápido Paulista',
    document: '11222333000181',
    manager: { email: 'rapido@demo.minitms.dev', name: 'Rafael Alves' },
    cities: ['São Paulo', 'Guarulhos', 'Campinas', 'Santos'],
    farStates: [],
    modalityCodes: ['EXPRESS', 'FULL'],
  },
  {
    companyName: 'EconoLog',
    document: '44555666000181',
    manager: { email: 'econolog@demo.minitms.dev', name: 'Juliana Rocha' },
    cities: null,
    farStates: ['RJ', 'MG', 'PR'],
    modalityCodes: ['STANDARD', 'FULL'],
  },
] as const satisfies readonly {
  companyName: string;
  document: string;
  manager: { email: string; name: string };
  cities: readonly string[] | null;
  farStates: readonly string[];
  modalityCodes: readonly DemoModalityCode[];
}[];
type DemoExtraCarrierName = (typeof DEMO_EXTRA_CARRIERS)[number]['companyName'];

export const DEMO_ADDRESSES = [
  {
    street: 'Av. Paulista',
    number: '1000',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: DEMO_STATE,
    zipCode: '01310100',
  },
  {
    street: 'Rua Augusta',
    number: '2340',
    neighborhood: 'Jardins',
    city: 'São Paulo',
    state: DEMO_STATE,
    zipCode: '01412000',
  },
  {
    street: 'Av. Brasil',
    number: '455',
    neighborhood: 'Jardim Guanabara',
    city: 'Campinas',
    state: DEMO_STATE,
    zipCode: '13070178',
  },
  {
    street: 'Rua XV de Novembro',
    number: '88',
    neighborhood: 'Centro',
    city: 'Santos',
    state: DEMO_STATE,
    zipCode: '11010150',
  },
  {
    street: 'Av. Itavuvu',
    number: '1200',
    neighborhood: 'Vila Olímpia',
    city: 'Sorocaba',
    state: DEMO_STATE,
    zipCode: '18078005',
  },
  {
    street: 'Rua General Osório',
    number: '310',
    neighborhood: 'Centro',
    city: 'Ribeirão Preto',
    state: DEMO_STATE,
    zipCode: '14010000',
  },
  {
    street: 'Av. São João',
    number: '760',
    neighborhood: 'Jardim Esplanada',
    city: 'São José dos Campos',
    state: DEMO_STATE,
    zipCode: '12242000',
  },
  {
    street: 'Rua Dom Pedro II',
    number: '57',
    neighborhood: 'Centro',
    city: 'Guarulhos',
    state: DEMO_STATE,
    zipCode: '07011000',
  },
] as const;

// Terminal shipments only: these have no live-map route.
export const DEMO_FAR_ADDRESSES = [
  {
    street: 'Rua da Assembleia',
    number: '10',
    neighborhood: 'Centro',
    city: 'Rio de Janeiro',
    state: 'RJ',
    zipCode: '20011000',
  },
  {
    street: 'Rua Moreira César',
    number: '229',
    neighborhood: 'Icaraí',
    city: 'Niterói',
    state: 'RJ',
    zipCode: '24230054',
  },
  {
    street: 'Av. Afonso Pena',
    number: '1500',
    neighborhood: 'Centro',
    city: 'Belo Horizonte',
    state: 'MG',
    zipCode: '30130005',
  },
  {
    street: 'Rua Halfeld',
    number: '414',
    neighborhood: 'Centro',
    city: 'Juiz de Fora',
    state: 'MG',
    zipCode: '36010002',
  },
  {
    street: 'Rua XV de Novembro',
    number: '700',
    neighborhood: 'Centro',
    city: 'Curitiba',
    state: 'PR',
    zipCode: '80020310',
  },
  {
    street: 'Av. Higienópolis',
    number: '210',
    neighborhood: 'Centro',
    city: 'Londrina',
    state: 'PR',
    zipCode: '86020080',
  },
] as const;

const FAILURE_NOTES = [
  'Recipient not at home',
  'Address not found',
  'Business closed',
] as const;

export const STATUS_NOTES: Partial<Record<ShipmentStatus, string>> = {
  FAILED_DELIVERY: FAILURE_NOTES[0],
  RETURNED: 'Returned to sender after failed attempts',
  CANCELLED: 'Order cancelled by the customer',
};

export const DEMO_EMAILS = [
  ...DEMO_SELLERS.map((seller) => seller.email),
  ...DEMO_CARRIER_MEMBERS.map((member) => member.email),
  ...DEMO_EXTRA_CARRIERS.map((carrier) => carrier.manager.email),
];

type DemoAddress =
  | (typeof DEMO_ADDRESSES)[number]
  | (typeof DEMO_FAR_ADDRESSES)[number];

export const toAddressFields = (address: DemoAddress) => ({
  addressStreet: address.street,
  addressNumber: address.number,
  addressNeighborhood: address.neighborhood,
  addressCity: address.city,
  addressState: address.state,
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
  // Each extra carrier's manager owns its shipments; a missing one leaves them to the core carrier.
  extraCarriers: Partial<
    Record<
      DemoExtraCarrierName,
      { carrierId: string; ownerId: string; ownerUserId: string }
    >
  >;
  modalities: Record<DemoModalityCode, { id: string; slaHours: number | null }>;
}

const DAY_MS = 24 * MS_PER_HOUR;
const WEEK_MS = 7 * DAY_MS;
const HISTORY_DAYS = 90;
const DEFAULT_SLA_HOURS = 72;
const STAGE_WEIGHTS = [0.04, 0.2, 0.08, 0.55, 0.13];
const OWNER_POOL: DemoMemberEmail[] = [
  'operator1@demo.minitms.dev',
  'operator1@demo.minitms.dev',
  'operator1@demo.minitms.dev',
  'operator2@demo.minitms.dev',
  'operator2@demo.minitms.dev',
  'carrier@demo.minitms.dev',
];
const RAPIDO_ADDRESSES = DEMO_ADDRESSES.filter((address) =>
  (DEMO_EXTRA_CARRIERS[0].cities as readonly string[]).includes(address.city),
);

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
const CLOSED: ShipmentStatus[] = [
  DELIVERED,
  FAILED_DELIVERY,
  RETURNED,
  CANCELLED,
];
const pathUpTo = (status: ShipmentStatus) =>
  HAPPY_PATH.slice(0, HAPPY_PATH.indexOf(status) + 1);

interface ShipmentPlan {
  status: ShipmentStatus;
  modality: DemoModalityCode;
  uf: string;
  late?: boolean;
  cancelledFrom?: ShipmentStatus;
  // Cancelled plans: the week of the history they were created in.
  week?: number;
  // Open plans: hours from now to dueAt, negative once late.
  dueInHours?: number;
}

interface SellerPlan {
  // Created per week of the 90-day history, oldest first; the open plans fill its last 6 days.
  weekly: number[];
  closed: ShipmentPlan[];
  cancelled: ShipmentPlan[];
  open: ShipmentPlan[];
}

const repeat = (count: number, plan: ShipmentPlan) =>
  Array.from({ length: count }, () => plan);

const delivered = (
  uf: string,
  modality: DemoModalityCode,
  onTime: number,
  late: number,
) => [
  ...repeat(onTime, { status: DELIVERED, uf, modality }),
  ...repeat(late, { status: DELIVERED, uf, modality, late: true }),
];

const problem = (
  status: ShipmentStatus,
  uf: string,
  modality: DemoModalityCode,
): ShipmentPlan => ({ status, uf, modality });

const cancelled = (
  cancelledFrom: ShipmentStatus,
  modality: DemoModalityCode,
  week: number,
): ShipmentPlan => ({
  status: CANCELLED,
  cancelledFrom,
  uf: DEMO_STATE,
  modality,
  week,
});

const open = (
  status: ShipmentStatus,
  modality: DemoModalityCode,
  dueInHours: number,
): ShipmentPlan => ({ status, uf: DEMO_STATE, modality, dueInHours });

// The Overview's reference numbers (spec 10 FR-001).
const LOJA_DEMO: SellerPlan = {
  weekly: [11, 12, 12, 13, 12, 13, 13, 14, 14, 14, 16, 15],
  closed: [
    ...delivered('SP', 'EXPRESS', 27, 3),
    ...delivered('SP', 'STANDARD', 42, 2),
    ...delivered('SP', 'FULL', 21, 1),
    ...delivered('RJ', 'STANDARD', 16, 2),
    ...delivered('RJ', 'FULL', 8, 1),
    ...delivered('MG', 'STANDARD', 11, 1),
    ...delivered('MG', 'FULL', 5, 1),
    ...delivered('PR', 'STANDARD', 5, 1),
    ...delivered('PR', 'FULL', 2, 1),
    problem(FAILED_DELIVERY, 'SP', 'STANDARD'),
    problem(FAILED_DELIVERY, 'SP', 'EXPRESS'),
    problem(FAILED_DELIVERY, 'RJ', 'FULL'),
    problem(RETURNED, 'SP', 'STANDARD'),
    problem(RETURNED, 'SP', 'STANDARD'),
    problem(RETURNED, 'SP', 'FULL'),
    problem(RETURNED, 'RJ', 'STANDARD'),
    problem(RETURNED, 'MG', 'STANDARD'),
    problem(RETURNED, 'PR', 'STANDARD'),
  ],
  cancelled: [
    cancelled(PENDING, 'STANDARD', 1),
    cancelled(ACCEPTED, 'FULL', 3),
    cancelled(PENDING, 'EXPRESS', 5),
    cancelled(ACCEPTED, 'STANDARD', 8),
    cancelled(PENDING, 'STANDARD', 10),
  ],
  open: [
    open(PENDING, 'STANDARD', 71.6),
    open(PENDING, 'FULL', 46.8),
    open(PENDING, 'EXPRESS', 21.6),
    open(ACCEPTED, 'STANDARD', 60),
    open(ACCEPTED, 'FULL', 40),
    open(ACCEPTED, 'EXPRESS', 18),
    open(COLLECTED, 'FULL', 30),
    open(COLLECTED, 'STANDARD', 12),
    open(IN_TRANSIT, 'STANDARD', 40),
    open(IN_TRANSIT, 'STANDARD', 30),
    open(IN_TRANSIT, 'FULL', 25),
    open(IN_TRANSIT, 'FULL', 8),
    open(IN_TRANSIT, 'STANDARD', -7),
    open(OUT_FOR_DELIVERY, 'STANDARD', 20),
    open(OUT_FOR_DELIVERY, 'EXPRESS', 3),
    open(OUT_FOR_DELIVERY, 'FULL', -2),
  ],
};

const CASA_DEMO: SellerPlan = {
  weekly: [0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5],
  closed: [
    ...delivered('SP', 'STANDARD', 9, 1),
    ...delivered('SP', 'FULL', 4, 0),
    ...delivered('SP', 'EXPRESS', 3, 1),
    problem(FAILED_DELIVERY, 'SP', 'STANDARD'),
    problem(RETURNED, 'SP', 'FULL'),
  ],
  cancelled: [
    cancelled(PENDING, 'STANDARD', 9),
    cancelled(ACCEPTED, 'FULL', 11),
  ],
  open: [
    open(PENDING, 'STANDARD', 70),
    open(ACCEPTED, 'FULL', 40),
    open(ACCEPTED, 'STANDARD', 50),
    open(COLLECTED, 'STANDARD', 30),
    open(IN_TRANSIT, 'FULL', 20),
    open(IN_TRANSIT, 'STANDARD', 10),
    open(OUT_FOR_DELIVERY, 'EXPRESS', 12),
    open(OUT_FOR_DELIVERY, 'FULL', -3),
  ],
};

// In DEMO_SELLERS order.
const SELLER_PLANS = [LOJA_DEMO, CASA_DEMO];

export const DEMO_SHIPMENT_COUNT = SELLER_PLANS.reduce(
  (sum, plan) =>
    sum + plan.closed.length + plan.cancelled.length + plan.open.length,
  0,
);

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

  shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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
  createdAt: number,
  slaHours: number,
  now: number,
): PlannedEvent[] {
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
      gaps.push(random.between(24, 72));
    }
  } else {
    const ratio = plan.late
      ? random.between(1.15, 1.8)
      : random.between(0.5, 0.95);
    path = pathUpTo(plan.status);
    gaps = stageGaps(random, slaHours * ratio).slice(0, path.length - 1);
  }

  const totalMs = gaps.reduce((a, b) => a + b, 0) * MS_PER_HOUR;
  const available = now - createdAt - random.between(0.1, 2) * MS_PER_HOUR;
  const scale =
    !CLOSED.includes(plan.status) && totalMs > available
      ? available / totalMs
      : 1;

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

const slaOf = (tenant: DemoTenant, plan: ShipmentPlan) =>
  tenant.modalities[plan.modality].slaHours ?? DEFAULT_SLA_HOURS;

// Closed plans are shuffled into the weekly counts; open ones are placed by their due time.
function schedule(
  random: SeededRandom,
  tenant: DemoTenant,
  seller: SellerPlan,
  now: number,
) {
  const since = now - HISTORY_DAYS * DAY_MS;
  const inWeek = (week: number) =>
    since + (week + random.between(0.05, 0.95)) * WEEK_MS;
  const weeks = seller.weekly.flatMap((count, week) =>
    Array.from({ length: count }, () => week),
  );
  return [
    ...random
      .shuffle(seller.closed)
      .map((plan, i) => ({ plan, createdAt: inWeek(weeks[i]) })),
    ...seller.cancelled.map((plan) => ({
      plan,
      createdAt: inWeek(plan.week ?? 0),
    })),
    ...seller.open.map((plan) => ({
      plan,
      createdAt:
        now + ((plan.dueInHours ?? 0) - slaOf(tenant, plan)) * MS_PER_HOUR,
    })),
  ].sort((a, b) => a.createdAt - b.createdAt);
}

// Far UFs go to EconoLog, SP Express to Rápido Paulista, the rest to the core carrier.
const extraCarrierFor = (plan: ShipmentPlan): DemoExtraCarrierName | null => {
  if (plan.uf !== DEMO_STATE) return 'EconoLog';
  return plan.modality === 'EXPRESS' ? 'Rápido Paulista' : null;
};

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
  const planned = SELLER_PLANS.flatMap((seller, sellerIndex) =>
    schedule(random, tenant, seller, now).map((item) => ({
      ...item,
      sellerIndex,
    })),
  );

  return planned.map(({ plan, createdAt: start, sellerIndex }, index) => {
    const modality = tenant.modalities[plan.modality];
    const extraName = extraCarrierFor(plan);
    const extra = extraName ? tenant.extraCarriers[extraName] : undefined;
    let addresses: readonly DemoAddress[] = DEMO_ADDRESSES;
    if (plan.uf !== DEMO_STATE) {
      addresses = DEMO_FAR_ADDRESSES.filter((a) => a.state === plan.uf);
    } else if (extra) {
      addresses = RAPIDO_ADDRESSES;
    }
    const address = random.pick(addresses);
    const events = planEvents(random, plan, start, slaOf(tenant, plan), now);
    let owner: { id: string; userId: string } | null = null;
    if (events.some((e) => e.status === ACCEPTED)) {
      const member = random.pick(OWNER_POOL);
      owner = extra
        ? { id: extra.ownerId, userId: extra.ownerUserId }
        : {
            id: tenant.carrierUserIds[member],
            userId: tenant.memberUserIds[member],
          };
    }
    const createdAt = events[0].at;

    return {
      shipment: {
        trackingCode: demoTrackingCode(index),
        sellerId: tenant.sellerIds[sellerIndex],
        carrierId: extra?.carrierId ?? tenant.carrierId,
        modalityId: modality.id,
        ownerId: owner?.id ?? null,
        status: plan.status,
        ...toAddressFields(address),
        createdAt,
        updatedAt: events[events.length - 1].at,
        dueAt: computeDueAt(createdAt, modality.slaHours),
        deliveredAt: events.find((e) => e.status === DELIVERED)?.at ?? null,
      },
      events: events.map((event) => ({
        status: event.status,
        note:
          event.status === FAILED_DELIVERY
            ? random.pick(FAILURE_NOTES)
            : (STATUS_NOTES[event.status] ?? null),
        // The seller opens and cancels; every carrier step is the owner's.
        actorId:
          event.status === PENDING || event.status === CANCELLED || !owner
            ? tenant.sellerUserIds[sellerIndex]
            : owner.userId,
        createdAt: event.at,
      })),
    };
  });
}
