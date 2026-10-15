import {
  APPROVAL_STATUS_LABEL,
  SHIPMENT_STATUS_LABEL,
} from '@/lib/status-labels';
import type { ApprovalStatus, ShipmentStatus } from '@/types/status';

interface StatusMeta {
  label: string;
  className: string;
}

function withLabels<S extends string>(
  labels: Record<S, string>,
  classNames: Record<S, string>,
): Record<S, StatusMeta> {
  return Object.fromEntries(
    Object.entries<string>(labels).map(([status, label]) => [
      status,
      { label, className: classNames[status as S] },
    ]),
  ) as Record<S, StatusMeta>;
}

export const APPROVAL_STATUS = withLabels<ApprovalStatus>(
  APPROVAL_STATUS_LABEL,
  {
    PENDING: 'bg-status-pending-bg text-status-pending-fg',
    APPROVED: 'bg-status-delivered-bg text-status-delivered-fg',
    REJECTED: 'bg-status-failed-delivery-bg text-status-failed-delivery-fg',
  },
);

export const SHIPMENT_STATUS = withLabels<ShipmentStatus>(
  SHIPMENT_STATUS_LABEL,
  {
    PENDING: 'bg-status-pending-bg text-status-pending-fg',
    ACCEPTED: 'bg-status-accepted-bg text-status-accepted-fg',
    COLLECTED: 'bg-status-collected-bg text-status-collected-fg',
    IN_TRANSIT: 'bg-status-in-transit-bg text-status-in-transit-fg',
    OUT_FOR_DELIVERY:
      'bg-status-out-for-delivery-bg text-status-out-for-delivery-fg',
    DELIVERED: 'bg-status-delivered-bg text-status-delivered-fg',
    FAILED_DELIVERY:
      'bg-status-failed-delivery-bg text-status-failed-delivery-fg',
    CANCELLED: 'bg-status-cancelled-bg text-status-cancelled-fg',
    RETURNED: 'bg-status-returned-bg text-status-returned-fg',
  },
);

export const SHIPMENT_STATUSES = Object.keys(
  SHIPMENT_STATUS,
) as ShipmentStatus[];

export const SHIPMENT_STATUS_DOT: Record<ShipmentStatus, string> = {
  PENDING: 'text-status-pending-dot',
  ACCEPTED: 'text-status-accepted-dot',
  COLLECTED: 'text-status-collected-dot',
  IN_TRANSIT: 'text-status-in-transit-dot',
  OUT_FOR_DELIVERY: 'text-status-out-for-delivery-dot',
  DELIVERED: 'text-status-delivered-dot',
  FAILED_DELIVERY: 'text-status-failed-delivery-dot',
  CANCELLED: 'text-status-cancelled-dot',
  RETURNED: 'text-status-returned-dot',
};
