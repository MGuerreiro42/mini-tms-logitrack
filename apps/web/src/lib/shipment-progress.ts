import type { ShipmentStatus, TimelineEvent } from '@/types/status';

export const HAPPY_PATH = [
  'PENDING',
  'ACCEPTED',
  'COLLECTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const satisfies readonly ShipmentStatus[];

const STEPS: readonly ShipmentStatus[] = HAPPY_PATH;

export function nextExpectedStatus(
  status: ShipmentStatus,
): ShipmentStatus | undefined {
  if (status === 'FAILED_DELIVERY') return 'RETURNED';
  const index = STEPS.indexOf(status);
  return index === -1 ? undefined : STEPS[index + 1];
}

export function isOnHappyPath(status: ShipmentStatus): boolean {
  return STEPS.includes(status);
}

export function reachedStepIndex(
  status: ShipmentStatus,
  events: TimelineEvent[] = [],
): number {
  return Math.max(
    0,
    ...[status, ...events.map((event) => event.status)].map((reached) =>
      STEPS.indexOf(reached),
    ),
  );
}

export function newestFirst<T extends TimelineEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
