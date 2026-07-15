import { ShipmentStatus } from '../../../generated/prisma/client';

// Forward-only happy path + one failure branch (DESIGN.md § 10/§ 3). PENDING
// only ever advances via the dedicated claim endpoint (see shipments.service
// ts's explicit guard), never through this generic map alone — see the
// comment on ShipmentsService.updateStatus for why that split matters.
export const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.PENDING]: [ShipmentStatus.ACCEPTED],
  [ShipmentStatus.ACCEPTED]: [ShipmentStatus.COLLECTED],
  [ShipmentStatus.COLLECTED]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.OUT_FOR_DELIVERY],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED_DELIVERY,
  ],
  [ShipmentStatus.FAILED_DELIVERY]: [ShipmentStatus.RETURNED],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.RETURNED]: [],
  // Cancellation rule (up to which status a seller may cancel) is an open
  // product decision per SCREENS.md's Known Gaps — not this slice's call to
  // make, so CANCELLED has no inbound transition here.
  [ShipmentStatus.CANCELLED]: [],
};

export function isValidTransition(
  from: ShipmentStatus,
  to: ShipmentStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
