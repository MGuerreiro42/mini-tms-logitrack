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

export type ApprovalStatusCounts = Record<ApprovalStatus, number>;
export type ShipmentStatusCounts = Record<ShipmentStatus, number>;

export interface TimelineEvent {
  status: ShipmentStatus;
  createdAt: string;
  note?: string | null;
}

export interface TrackingEvent extends TimelineEvent {
  id: string;
  note: string | null;
}
