import type { ApprovalStatus, ShipmentStatus } from '@/types/status';

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

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
