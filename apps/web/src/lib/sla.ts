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
const CLOSED: ShipmentStatus[] = ['CANCELLED', 'RETURNED'];

function span(minutes: number, round: (value: number) => number): string {
  if (minutes < MINUTES_PER_HOUR) return `${Math.max(1, minutes)} min`;
  const hours = round(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_SHOWN_BELOW) return `${hours} h`;
  return `${round(hours / HOURS_PER_DAY)} d`;
}

export function slaState({
  dueAt,
  status,
  now = new Date(),
}: {
  dueAt: string | null | undefined;
  status: ShipmentStatus;
  now?: Date;
}): SlaState {
  if (!dueAt || CLOSED.includes(status)) return { label: '—', tone: 'muted' };
  if (status === 'DELIVERED') return { label: 'Delivered', tone: 'muted' };

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
