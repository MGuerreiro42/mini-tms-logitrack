import type { ShipmentActivity } from '../types';

// More arrivals at once (a reconnect, a tab coming back) appear without entrance animations.
export const MAX_ANIMATED_ARRIVALS = 3;

export function newArrivals<T extends ShipmentActivity>(
  shown: readonly T[],
  latest: readonly T[],
): T[] {
  const shownIds = new Set(shown.map((event) => event.id));
  return latest.filter((event) => !shownIds.has(event.id));
}
