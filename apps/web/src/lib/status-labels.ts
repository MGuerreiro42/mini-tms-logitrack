import type { ApprovalStatus, ShipmentStatus } from '@/types/status';

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// The open statuses in lifecycle order.
export const PIPELINE_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'COLLECTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
] as const satisfies ShipmentStatus[];

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  COLLECTED: 'Collected',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED_DELIVERY: 'Failed delivery',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};
