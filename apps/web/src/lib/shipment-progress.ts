import type { ShipmentStatus, TimelineEvent } from '@/types/status';

export const HAPPY_PATH = [
  'PENDING',
  'ACCEPTED',
  'COLLECTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const satisfies readonly ShipmentStatus[];

const NEXT_EXPECTED: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'COLLECTED',
  COLLECTED: 'IN_TRANSIT',
  IN_TRANSIT: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
  FAILED_DELIVERY: 'RETURNED',
};

export function nextExpectedStatus(
  status: ShipmentStatus,
): ShipmentStatus | undefined {
  return NEXT_EXPECTED[status];
}

export function isOnHappyPath(status: ShipmentStatus): boolean {
  return (HAPPY_PATH as readonly ShipmentStatus[]).includes(status);
}

export function reachedStepIndex(
  status: ShipmentStatus,
  events: TimelineEvent[] = [],
): number {
  return Math.max(
    0,
    ...[status, ...events.map((event) => event.status)].map((reached) =>
      (HAPPY_PATH as readonly ShipmentStatus[]).indexOf(reached),
    ),
  );
}

export function newestFirst<T extends TimelineEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
