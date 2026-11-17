import type { ShipmentActivity } from '../types';

// More arrivals at once (a reconnect, a tab coming back) appear without entrance animations.
export const MAX_ANIMATED_ARRIVALS = 3;

export function newArrivals(
  shown: readonly ShipmentActivity[],
  latest: readonly ShipmentActivity[],
): ShipmentActivity[] {
  const shownIds = new Set(shown.map((event) => event.id));
  return latest.filter((event) => !shownIds.has(event.id));
}
