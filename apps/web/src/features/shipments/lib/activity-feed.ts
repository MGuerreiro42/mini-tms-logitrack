import type { ShipmentActivity, ShipmentStatus } from '../types';

// More arrivals at once (a reconnect, a tab coming back) appear without entrance animations.
export const MAX_ANIMATED_ARRIVALS = 3;

export function newArrivals<T extends ShipmentActivity>(
  shown: readonly T[],
  latest: readonly T[],
): T[] {
  const shownIds = new Set(shown.map((event) => event.id));
  return latest.filter((event) => !shownIds.has(event.id));
}

export const MAX_ACTIVITY_GROUPS = 6;

export type ActivityGroup = ShipmentActivity & {
  previousStatus: ShipmentStatus | null;
};

// Events come newest first: each shipment keeps its newest position, and the next older event
// of the same shipment in the batch gives the status it came from. `known` remembers that status
// per event id, so a row keeps it after its older event leaves the batch.
export function groupActivity(
  events: ShipmentActivity[],
  known: Map<string, ShipmentStatus>,
): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const event of events) {
    const group = groups.find((g) => g.shipmentId === event.shipmentId);
    if (!group) groups.push({ ...event, previousStatus: null });
    else group.previousStatus ??= event.status;
  }
  return groups.slice(0, MAX_ACTIVITY_GROUPS).map((group) => {
    const previousStatus = group.previousStatus ?? known.get(group.id) ?? null;
    if (previousStatus) known.set(group.id, previousStatus);
    return { ...group, previousStatus };
  });
}
