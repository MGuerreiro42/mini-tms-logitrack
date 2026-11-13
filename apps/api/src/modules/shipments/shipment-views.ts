import { type Prisma, ShipmentStatus } from '../../../generated/prisma/client';
import {
  daysAgo,
  MS_PER_HOUR,
  type StatsWindow,
  WINDOW_DAYS,
} from '../../shared/stats/stats';
import { ROAD_STAGES, TERMINAL_STATUSES } from './shipment-status.util';

// Open and still on the clock.
export const OPEN_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.PENDING,
  ShipmentStatus.ACCEPTED,
  ShipmentStatus.COLLECTED,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
];

export const SELLER_VIEWS = ['active', 'late', 'exceptions', 'done'] as const;
// Opened from the seller Overview: listed, never counted as tabs (spec 10 FR-013).
export const SLA_STATE_VIEWS = ['on-track', 'due-soon'] as const;
export const SELLER_LIST_VIEWS = [
  ...SELLER_VIEWS,
  ...SLA_STATE_VIEWS,
  'waiting',
] as const;
export const SLA_OUTCOMES = ['on-time', 'late'] as const;
export const WAITING_AFTER_HOURS = 2;
export const ADMIN_VIEWS = SELLER_VIEWS;
export const CARRIER_VIEWS = [
  'mine',
  'unclaimed',
  'to_pick_up',
  'on_the_road',
  'exceptions',
  'done',
] as const;

export type ShipmentView =
  | (typeof CARRIER_VIEWS)[number]
  | (typeof SELLER_LIST_VIEWS)[number];
export type SlaStateView = (typeof SLA_STATE_VIEWS)[number];

export const isSlaStateView = (view?: ShipmentView): view is SlaStateView =>
  (SLA_STATE_VIEWS as readonly string[]).includes(view ?? '');

export interface ViewContext {
  now: Date;
  // Null outside the carrier lists, where "mine" has no meaning.
  carrierUserId: string | null;
  // An SLA-state view's ids, resolved by the caller's raw query.
  slaStateIds?: string[];
}

const slaStateWhere = ({ slaStateIds }: ViewContext) => {
  if (!slaStateIds) throw new Error('An SLA-state view needs its ids first');
  return { id: { in: slaStateIds } };
};

const VIEW_WHERE: Record<
  ShipmentView,
  (ctx: ViewContext) => Prisma.ShipmentWhereInput
> = {
  active: () => ({ status: { in: OPEN_STATUSES } }),
  late: ({ now }) => ({ status: { in: OPEN_STATUSES }, dueAt: { lt: now } }),
  // Failed, late or waiting: what the seller Overview counts as exceptions.
  exceptions: (ctx) => ({
    OR: [
      { status: ShipmentStatus.FAILED_DELIVERY },
      VIEW_WHERE.late(ctx),
      VIEW_WHERE.waiting(ctx),
    ],
  }),
  waiting: ({ now }) => ({
    status: ShipmentStatus.PENDING,
    ownerId: null,
    createdAt: {
      lt: new Date(now.getTime() - WAITING_AFTER_HOURS * MS_PER_HOUR),
    },
  }),
  'on-track': slaStateWhere,
  'due-soon': slaStateWhere,
  done: () => ({ status: { in: TERMINAL_STATUSES } }),
  mine: ({ carrierUserId }) => {
    // A null owner would match every unclaimed shipment instead of none.
    if (!carrierUserId)
      throw new Error('"mine" needs the caller\'s carrier user');
    return { ownerId: carrierUserId, status: { notIn: TERMINAL_STATUSES } };
  },
  unclaimed: () => ({ status: ShipmentStatus.PENDING, ownerId: null }),
  to_pick_up: () => ({
    status: { in: [ShipmentStatus.ACCEPTED, ShipmentStatus.COLLECTED] },
  }),
  on_the_road: () => ({ status: { in: ROAD_STAGES } }),
};

export const viewWhere = (
  view: ShipmentView,
  ctx: ViewContext,
): Prisma.ShipmentWhereInput => VIEW_WHERE[view](ctx);

const ZIP_SHAPED = /^[\d\s.-]+$/;
const MIN_ZIP_DIGITS = 3;

export function searchWhere(
  q: string,
  { includeSeller }: { includeSeller: boolean },
): Prisma.ShipmentWhereInput {
  // Prisma sends contains as a raw LIKE pattern: a typed % or _ must match only itself.
  const pattern = q.replace(/[\\%_]/g, '\\$&');
  const contains = { contains: pattern, mode: 'insensitive' } as const;
  const digits = q.replace(/\D/g, '');
  return {
    OR: [
      { trackingCode: contains },
      { addressCity: contains },
      ...(ZIP_SHAPED.test(q) && digits.length >= MIN_ZIP_DIGITS
        ? [{ addressZipCode: { startsWith: digits } }]
        : []),
      ...(includeSeller ? [{ seller: { companyName: contains } }] : []),
    ],
  };
}

export const isOpenView = (view: ShipmentView): boolean => view !== 'done';

export interface ListFilters {
  status?: ShipmentStatus;
  view?: ShipmentView;
  q?: string;
  window?: StatsWindow;
  uf?: string;
  modality?: string;
  sla?: (typeof SLA_OUTCOMES)[number];
}

export interface ListContext extends ViewContext {
  includeSeller: boolean;
  // prisma.shipment.fields.dueAt: on time compares two columns of one row.
  dueAt: Prisma.DateTimeFieldRefInput<'Shipment'>;
}

export const windowWhere = (
  window: StatsWindow | undefined,
  now: Date,
): Prisma.ShipmentWhereInput =>
  window ? { createdAt: { gte: daysAgo(WINDOW_DAYS[window], now) } } : {};

// Every filter narrows by AND; the scope always carries the tenant.
export function listWhere(
  scope: Prisma.ShipmentWhereInput,
  { status, view, q, window, uf, modality, sla }: ListFilters,
  ctx: ListContext,
): Prisma.ShipmentWhereInput {
  const parts = [{ ...scope, ...windowWhere(window, ctx.now) }];
  if (status) parts.push({ status });
  if (view) parts.push(viewWhere(view, ctx));
  if (q) parts.push(searchWhere(q, ctx));
  if (uf) parts.push({ addressState: uf });
  if (modality) parts.push({ modality: { code: modality } });
  if (sla) {
    parts.push({
      status: ShipmentStatus.DELIVERED,
      deliveredAt: sla === 'late' ? { gt: ctx.dueAt } : { lte: ctx.dueAt },
    });
  }
  return { AND: parts };
}

export function listOrderBy(
  view?: ShipmentView,
): Prisma.ShipmentOrderByWithRelationInput[] {
  return view && isOpenView(view)
    ? [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
    : [{ createdAt: 'desc' }];
}
