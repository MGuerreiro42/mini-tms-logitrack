import { ShipmentStatus } from '../../../generated/prisma/client';

// PENDING only advances via claim; CANCELLED is only reachable via the seller's cancel.
export const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.PENDING]: [ShipmentStatus.ACCEPTED, ShipmentStatus.CANCELLED],
  [ShipmentStatus.ACCEPTED]: [
    ShipmentStatus.COLLECTED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.COLLECTED]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.OUT_FOR_DELIVERY],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED_DELIVERY,
  ],
  [ShipmentStatus.FAILED_DELIVERY]: [ShipmentStatus.RETURNED],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.RETURNED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

export const CANCELLABLE_STATUSES = Object.values(ShipmentStatus).filter(
  (status) => ALLOWED_TRANSITIONS[status].includes(ShipmentStatus.CANCELLED),
);

export function isValidTransition(
  from: ShipmentStatus,
  to: ShipmentStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
