import type {
  LastPosition,
  LngLat,
  PositionEvent,
} from '@/features/tracking/types';
import type { StatsWindow } from '@/hooks/use-stats-window';
import type {
  ClaimMetric,
  OnTimeTrend,
  Rate,
  StageDuration,
} from '@/lib/metrics';
import type { PaginationQuery } from '@/types/pagination';
import type {
  ShipmentStatus,
  ShipmentStatusCounts,
  TrackingEvent,
} from '@/types/status';

export type { ShipmentStatus, ShipmentStatusCounts };

export interface AdminMetrics {
  shipments: number;
  active: number;
  lateNow: number;
  onTime: OnTimeTrend;
  firstAttempt: {
    rate: number | null;
    n: number;
    failed: number;
    returned: number;
  };
  claim: ClaimMetric;
  byCarrier: (Rate & { carrierId: string; companyName: string })[];
}

export interface SellerMetrics {
  shipments: number;
  cancelled: number;
  delivered: number;
  onTime: OnTimeTrend;
  byModality: (Rate & { modalityCode: string; modalityName: string })[];
  medianDelivery: { hours: number | null; p90Hours: number | null; n: number };
  firstAttempt: AdminMetrics['firstAttempt'];
  stages: StageDuration[];
  slaMedianHours: number | null;
  byState: (Rate & { uf: string })[];
  volume: {
    bucket: 'day' | 'week';
    points: {
      start: string;
      delivered: number;
      problem: number;
      open: number;
    }[];
  };
  // The previous window's rates; the web applies MIN_SAMPLE and maturity (spec 10 FR-008).
  comparison: {
    since: string;
    previousSince: string;
    mature: boolean;
    onTime: Rate;
    firstAttempt: Rate;
  };
}

export interface ShipmentActivity {
  id: string;
  shipmentId: string;
  trackingCode: string;
  status: ShipmentStatus;
  city: string;
  createdAt: string;
}

// `type` stays open: the API may add groups (phase 4) the web has no entry for.
export interface AttentionGroup {
  type: string;
  label: string;
  owner: 'carrier' | 'seller' | 'recipient' | 'unknown';
  count: number;
  href: string;
  items: {
    shipment: Shipment;
    since: string;
    reason: { code: string | null; text: string } | null;
  }[];
}

export interface ShipmentAttention {
  shipments: Shipment[];
  counts: { failed: number; late: number; waiting: number };
  oldestLateDueAt: string | null;
  oldestPendingAt: string | null;
  groups: AttentionGroup[];
}

export interface ShipmentAddress {
  addressStreet: string;
  addressNumber: string;
  addressComplement: string | null;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
}

export interface ShipmentBase extends ShipmentAddress {
  id: string;
  trackingCode: string;
  status: ShipmentStatus;
  modalityId: string;
  modalityName: string;
  createdAt: string;
  dueAt: string | null;
  deliveredAt: string | null;
  trackingEvents?: TrackingEvent[];
}

export interface Shipment extends ShipmentBase {
  carrierId: string;
  carrierName: string;
}

export interface CarrierShipment extends ShipmentBase {
  sellerId: string;
  sellerCompanyName: string;
  sellerEmail: string;
  ownerId: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
}

export interface ShipmentMap {
  route: LngLat[];
  splitIndex: number;
  destination: LngLat;
}

interface LiveMapFields {
  map: ShipmentMap | null;
  lastPosition: LastPosition | null;
}

export interface ShipmentDetail extends Shipment, LiveMapFields {}

export interface QueueShipmentDetail extends CarrierShipment, LiveMapFields {}

export interface ShipmentPositionEvent extends PositionEvent {
  shipmentId: string;
}

export interface AdminShipmentResponse extends CarrierShipment {
  carrierCompanyName: string;
}

export interface AdminShipment extends CarrierShipment {
  carrierName: string;
}

export interface AdminShipmentDetail extends AdminShipment {
  trackingEvents: TrackingEvent[];
}

// The carrier, seller and window every admin read of shipments can be narrowed to.
export interface AdminScopeQuery {
  carrierId?: string;
  sellerId?: string;
  window?: StatsWindow;
}

export interface ListAdminShipmentsQuery
  extends PaginationQuery,
    AdminScopeQuery {
  status?: ShipmentStatus;
  view?: ListView;
  q?: string;
}

export interface CreateShipmentInput {
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  modalityId: string;
  carrierId: string;
}

export interface ModalityOption {
  id: string;
  name: string;
  slaHours?: number | null;
}

export interface EligibleCarrier {
  id: string;
  companyName: string;
}

// The seller and admin views (the carrier has its own).
export type ListView = 'active' | 'late' | 'exceptions';

// The API also counts done, which no tab shows.
export type ViewCounts = Record<ListView | 'done', number>;

// Seller views opened from the Overview; no tab shows them.
export type LinkView = 'on-track' | 'due-soon' | 'waiting';
export type SlaOutcome = 'on-time' | 'late';

export interface ListShipmentsQuery extends PaginationQuery {
  status?: ShipmentStatus;
  view?: ListView | LinkView;
  q?: string;
  window?: StatsWindow;
  uf?: string;
  modality?: string;
  sla?: SlaOutcome;
}

export const CARRIER_VIEWS = [
  'mine',
  'unclaimed',
  'to_pick_up',
  'on_the_road',
  'exceptions',
  'done',
] as const;

export type CarrierView = (typeof CARRIER_VIEWS)[number];

export interface ListQueueQuery extends PaginationQuery {
  status?: ShipmentStatus;
  view?: CarrierView;
  q?: string;
}

export const TRACKING_NOTE_MAX_LENGTH = 500;

export interface UpdateShipmentStatusInput {
  status: ShipmentStatus;
  note?: string;
}

// UI mirror of the API transition map; the API re-validates. PENDING advances via Claim.
export const ALLOWED_NEXT_STATUSES: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: [],
  ACCEPTED: ['COLLECTED'],
  COLLECTED: ['IN_TRANSIT'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY'],
  FAILED_DELIVERY: ['RETURNED'],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

const SELLER_CANCELLABLE: ShipmentStatus[] = ['PENDING', 'ACCEPTED'];

export function isCancellableBySeller(status: ShipmentStatus): boolean {
  return SELLER_CANCELLABLE.includes(status);
}

export function isClaimable(
  shipment: Pick<CarrierShipment, 'status' | 'ownerId'>,
): boolean {
  return shipment.status === 'PENDING' && !shipment.ownerId;
}

export function ownerLabel(shipment: CarrierShipment): string {
  return shipment.ownerEmail ?? (isClaimable(shipment) ? 'Unclaimed' : '—');
}
