import {
  type Prisma,
  ShipmentStatus,
} from '../../../../generated/prisma/client';
import type { PrismaService } from '../../../shared/prisma/prisma.service';
import { groupBy, hoursBetween } from '../../../shared/stats/stats';
import { type MetricRow, STAGE_STATUSES } from './delivery-metrics';

const SHIPMENT_SELECT = {
  id: true,
  createdAt: true,
  status: true,
  dueAt: true,
  deliveredAt: true,
  modality: { select: { code: true, name: true } },
} satisfies Prisma.ShipmentSelect;

type MetricShipment = Prisma.ShipmentGetPayload<{
  select: typeof SHIPMENT_SELECT;
}>;
type MetricEvent = {
  shipmentId: string;
  status: ShipmentStatus;
  createdAt: Date;
};

const HAPPY_PATH: ShipmentStatus[] = [
  ...STAGE_STATUSES,
  ShipmentStatus.DELIVERED,
];
// A stage counts only when its next event is the happy-path successor.
const isHappyStep = (from: ShipmentStatus, to: ShipmentStatus) => {
  const index = HAPPY_PATH.indexOf(from);
  return index >= 0 && HAPPY_PATH[index + 1] === to;
};

// Pure: events must be ordered by shipment, then time.
export function toMetricRows(
  shipments: MetricShipment[],
  events: MetricEvent[],
): MetricRow[] {
  const history = groupBy(events, (event) => event.shipmentId);
  return shipments.map(({ id, ...shipment }) => {
    const own = history.get(id) ?? [];
    return {
      ...shipment,
      acceptedAt:
        own.find((event) => event.status === ShipmentStatus.ACCEPTED)
          ?.createdAt ?? null,
      // From history, not current status: a FAILED_DELIVERY that moved on to RETURNED still failed.
      everFailed: own.some(
        (event) => event.status === ShipmentStatus.FAILED_DELIVERY,
      ),
      stages: own.slice(1).flatMap((next, i) =>
        isHappyStep(own[i].status, next.status)
          ? [
              {
                status: own[i].status,
                hours: hoursBetween(own[i].createdAt, next.createdAt),
              },
            ]
          : [],
      ),
    };
  });
}

// One shipment query and one event query, whatever the window holds.
export async function loadMetricRows(
  prisma: PrismaService,
  where: Prisma.ShipmentWhereInput,
): Promise<MetricRow[]> {
  const [shipments, events] = await Promise.all([
    prisma.shipment.findMany({ where, select: SHIPMENT_SELECT }),
    prisma.trackingEvent.findMany({
      where: { shipment: where },
      select: { shipmentId: true, status: true, createdAt: true },
      orderBy: [{ shipmentId: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);
  return toMetricRows(shipments, events);
}
