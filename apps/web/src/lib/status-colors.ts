import type { ApprovalStatus, ShipmentStatus } from '@/types/status';

interface StatusMeta {
  label: string;
  className: string;
}

export const APPROVAL_STATUS: Record<ApprovalStatus, StatusMeta> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-status-pending-bg text-status-pending-fg',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-status-delivered-bg text-status-delivered-fg',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-status-failed-delivery-bg text-status-failed-delivery-fg',
  },
};

export const SHIPMENT_STATUS: Record<ShipmentStatus, StatusMeta> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-status-pending-bg text-status-pending-fg',
  },
  ACCEPTED: {
    label: 'Accepted',
    className: 'bg-status-accepted-bg text-status-accepted-fg',
  },
  COLLECTED: {
    label: 'Collected',
    className: 'bg-status-collected-bg text-status-collected-fg',
  },
  IN_TRANSIT: {
    label: 'In transit',
    className: 'bg-status-in-transit-bg text-status-in-transit-fg',
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for delivery',
    className: 'bg-status-out-for-delivery-bg text-status-out-for-delivery-fg',
  },
  DELIVERED: {
    label: 'Delivered',
    className: 'bg-status-delivered-bg text-status-delivered-fg',
  },
  FAILED_DELIVERY: {
    label: 'Failed delivery',
    className: 'bg-status-failed-delivery-bg text-status-failed-delivery-fg',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-status-cancelled-bg text-status-cancelled-fg',
  },
  RETURNED: {
    label: 'Returned',
    className: 'bg-status-returned-bg text-status-returned-fg',
  },
};

export const SHIPMENT_STATUSES = Object.keys(
  SHIPMENT_STATUS,
) as ShipmentStatus[];
