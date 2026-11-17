import type {
  AttentionGroup,
  SellerMetrics,
  Shipment,
  ShipmentAttention,
  ShipmentStatus,
} from '@/features/shipments/types';

export const API_URL = 'http://localhost:3333';
export const HOUR_MS = 3_600_000;

export function shipment(
  id: string,
  status: ShipmentStatus,
  dueInHours: number,
  slaHours = 72,
): Shipment {
  const dueAt = Date.now() + dueInHours * HOUR_MS;
  return {
    id,
    trackingCode: `TMS-${id.toUpperCase()}`,
    status,
    dueAt: new Date(dueAt).toISOString(),
    deliveredAt: null,
    carrierId: 'carrier-1',
    carrierName: 'Fast Carrier',
    modalityId: 'modality-1',
    modalityName: 'Standard',
    addressStreet: 'Av. Paulista',
    addressNumber: '1000',
    addressComplement: null,
    addressNeighborhood: 'Bela Vista',
    addressCity: 'Bauru',
    addressState: 'SP',
    addressZipCode: '01310-100',
    createdAt: new Date(dueAt - slaHours * HOUR_MS).toISOString(),
  };
}

const rate = (count: number, n: number) => ({
  count,
  n,
  rate: n ? (count / n) * 100 : null,
});

// The 90 d demo numbers of final.md.
export function sellerMetrics(
  overrides: Partial<SellerMetrics> = {},
): SellerMetrics {
  return {
    shipments: 180,
    cancelled: 5,
    delivered: 150,
    onTime: { ...rate(137, 150), trend: [] },
    byModality: [
      { modalityCode: 'STANDARD', modalityName: 'Standard', ...rate(74, 80) },
    ],
    medianDelivery: { hours: 41, p90Hours: 68, n: 150 },
    firstAttempt: { rate: (150 / 159) * 100, n: 159, failed: 3, returned: 6 },
    stages: [],
    slaMedianHours: 72,
    byState: [{ uf: 'PR', ...rate(7, 9) }],
    volume: {
      bucket: 'week',
      points: [
        {
          start: '2026-08-13T03:00:00.000Z',
          delivered: 10,
          problem: 1,
          open: 0,
        },
        {
          start: '2026-08-20T03:00:00.000Z',
          delivered: 7,
          problem: 0,
          open: 9,
        },
      ],
    },
    comparison: {
      since: '2026-08-13T03:00:00.000Z',
      previousSince: '2026-05-15T03:00:00.000Z',
      mature: true,
      onTime: rate(74, 84),
      firstAttempt: rate(92, 100),
    },
    ...overrides,
  };
}

export function attention(
  late: Shipment[],
  failed: Shipment[],
): ShipmentAttention {
  return {
    shipments: [...failed, ...late],
    counts: { late: late.length, failed: failed.length, waiting: 0 },
    oldestLateDueAt: late[0]?.dueAt ?? null,
    oldestPendingAt: null,
    groups: (
      [
        {
          type: 'late',
          label: 'Late',
          owner: 'carrier',
          count: late.length,
          href: '?view=late',
          items: late.map((item) => ({
            shipment: item,
            since: item.dueAt as string,
            reason: null,
          })),
        },
        {
          type: 'failed',
          label: 'Failed attempt',
          owner: 'carrier',
          count: failed.length,
          href: '?status=FAILED_DELIVERY',
          items: failed.map((item) => ({
            shipment: item,
            since: item.createdAt,
            reason: { code: null, text: 'Recipient not at home' },
          })),
        },
      ] satisfies AttentionGroup[]
    ).filter((group) => group.count > 0),
  };
}
