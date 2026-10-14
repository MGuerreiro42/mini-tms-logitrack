import type { ShipmentStatus } from '@/types/status';

export type SlaTone = 'muted' | 'soon' | 'late';

export interface SlaState {
  label: string;
  tone: SlaTone;
}

const HOUR_MS = 60 * 60 * 1000;
const SOON_HOURS = 6;
const HOURS_SHOWN_UP_TO = 48;
const CLOSED: ShipmentStatus[] = ['CANCELLED', 'RETURNED'];

function span(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < HOURS_SHOWN_UP_TO) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} d`;
}

export function slaState({
  dueAt,
  status,
  deliveredAt,
  now = new Date(),
}: {
  dueAt: string | null | undefined;
  status: ShipmentStatus;
  deliveredAt?: string;
  now?: Date;
}): SlaState {
  if (!dueAt || CLOSED.includes(status)) return { label: '—', tone: 'muted' };

  const due = new Date(dueAt).getTime();
  if (status === 'DELIVERED') {
    if (!deliveredAt) return { label: 'Delivered', tone: 'muted' };
    return new Date(deliveredAt).getTime() <= due
      ? { label: 'On time', tone: 'muted' }
      : { label: 'Delivered late', tone: 'late' };
  }

  const hoursLeft = (due - now.getTime()) / HOUR_MS;
  if (hoursLeft < 0) return { label: `${span(-hoursLeft)} late`, tone: 'late' };
  return {
    label: `Due in ${span(hoursLeft)}`,
    tone: hoursLeft < SOON_HOURS ? 'soon' : 'muted',
  };
}
