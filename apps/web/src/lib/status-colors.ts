export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ShipmentStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_DELIVERY'
  | 'CANCELLED'
  | 'RETURNED';

interface StatusMeta {
  label: string;
  className: string;
}

// Tailwind class strings, not new theme colors — 12 narrow, enum-keyed
// mappings that nothing else in the app reuses (DESIGN.md § 19 discussion).
export const APPROVAL_STATUS: Record<ApprovalStatus, StatusMeta> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

export const SHIPMENT_STATUS: Record<ShipmentStatus, StatusMeta> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  ACCEPTED: {
    label: 'Accepted',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  COLLECTED: {
    label: 'Collected',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  IN_TRANSIT: {
    label: 'In transit',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for delivery',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  DELIVERED: {
    label: 'Delivered',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  FAILED_DELIVERY: {
    label: 'Failed delivery',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
  RETURNED: {
    label: 'Returned',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
};
