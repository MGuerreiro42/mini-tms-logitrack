import type { ShipmentStatus } from '@/types/status';

export type SlaTone = 'muted' | 'soon' | 'late';

export interface SlaState {
  label: string;
  tone: SlaTone;
}

const MINUTE_MS = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const SOON_HOURS = 6;
const HOURS_SHOWN_BELOW = 48;
const CLOSED: ShipmentStatus[] = ['CANCELLED', 'RETURNED', 'FAILED_DELIVERY'];

// Closed shipments neither count down nor get a verdict; a delivery gets one.
export function hasSlaVerdict(status: ShipmentStatus): boolean {
  return !CLOSED.includes(status);
}

function span(minutes: number, round: (value: number) => number): string {
  if (minutes < MINUTES_PER_HOUR) return `${Math.max(1, minutes)} min`;
  const hours = round(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_SHOWN_BELOW) return `${hours} h`;
  return `${round(hours / HOURS_PER_DAY)} d`;
}

function deliveredVerdict(
  dueAt: string,
  deliveredAt: string | null | undefined,
): SlaState {
  if (!deliveredAt) return { label: 'Delivered', tone: 'muted' };
  const msLate = new Date(deliveredAt).getTime() - new Date(dueAt).getTime();
  if (msLate <= 0) return { label: 'On time', tone: 'muted' };
  return {
    label: `Late by ${span(Math.ceil(msLate / MINUTE_MS), Math.ceil)}`,
    tone: 'late',
  };
}

export function slaState({
  dueAt,
  deliveredAt,
  status,
  now = new Date(),
}: {
  dueAt: string | null | undefined;
  deliveredAt?: string | null;
  status: ShipmentStatus;
  now?: Date;
}): SlaState {
  if (!dueAt || !hasSlaVerdict(status)) return { label: '—', tone: 'muted' };
  if (status === 'DELIVERED') return deliveredVerdict(dueAt, deliveredAt);

  const msLeft = new Date(dueAt).getTime() - now.getTime();
  if (msLeft < 0) {
    const late = Math.ceil(-msLeft / MINUTE_MS);
    return { label: `${span(late, Math.ceil)} late`, tone: 'late' };
  }

  const left = Math.floor(msLeft / MINUTE_MS);
  return {
    label: `Due in ${span(left, Math.floor)}`,
    tone: left < SOON_HOURS * MINUTES_PER_HOUR ? 'soon' : 'muted',
  };
}
