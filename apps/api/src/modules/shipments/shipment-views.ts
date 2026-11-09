import { type Prisma, ShipmentStatus } from '../../../generated/prisma/client';
import {
  daysAgo,
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
  | (typeof SELLER_VIEWS)[number];

export interface ViewContext {
  now: Date;
  // Null outside the carrier lists, where "mine" has no meaning.
  carrierUserId: string | null;
}

const VIEW_WHERE: Record<
  ShipmentView,
  (ctx: ViewContext) => Prisma.ShipmentWhereInput
> = {
  active: () => ({ status: { in: OPEN_STATUSES } }),
  late: ({ now }) => ({ status: { in: OPEN_STATUSES }, dueAt: { lt: now } }),
  // The rule of attentionForSeller: failed, or late.
  exceptions: (ctx) => ({
    OR: [{ status: ShipmentStatus.FAILED_DELIVERY }, VIEW_WHERE.late(ctx)],
  }),
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
}

export const windowWhere = (
  window: StatsWindow | undefined,
  now: Date,
): Prisma.ShipmentWhereInput =>
  window ? { createdAt: { gte: daysAgo(WINDOW_DAYS[window], now) } } : {};

// Scope, status, view, window and search narrow by AND; the scope always carries the tenant.
export function listWhere(
  scope: Prisma.ShipmentWhereInput,
  { status, view, q, window }: ListFilters,
  ctx: ViewContext & { includeSeller: boolean },
): Prisma.ShipmentWhereInput {
  const parts = [scope];
  if (window) parts.push(windowWhere(window, ctx.now));
  if (status) parts.push({ status });
  if (view) parts.push(viewWhere(view, ctx));
  if (q) parts.push(searchWhere(q, ctx));
  return { AND: parts };
}

export function listOrderBy(
  view?: ShipmentView,
): Prisma.ShipmentOrderByWithRelationInput[] {
  return view && isOpenView(view)
    ? [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
    : [{ createdAt: 'desc' }];
}
