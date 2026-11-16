import type { ShipmentStatus } from '@/types/status';
import { formatMonthDay, formatWeekdayTime } from './format-date';

export type SlaKind =
  | 'onTrack'
  | 'dueSoon'
  | 'late'
  | 'onTime'
  | 'deliveredLate'
  | 'failed'
  | 'none';

export type SlaTone =
  | 'neutral'
  | 'caution'
  | 'critical'
  | 'positive'
  | 'mutedCritical';

export interface SlaState {
  kind: SlaKind;
  label: string;
  tone: SlaTone;
  title?: string;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const HOURS_SHOWN_BELOW = 48;
const DUE_SOON_MIN_MS = 6 * HOUR_MS;
const DUE_SOON_SHARE = 0.25;
// A weekday only well inside the coming week, so it never reads as today or next week.
const WEEKDAY_SHOWN_BELOW_MS = 6 * HOURS_PER_DAY * HOUR_MS;
// The API's LATE_CANDIDATES: the statuses an SLA still runs for.
const OPEN: ShipmentStatus[] = [
  'PENDING',
  'ACCEPTED',
  'COLLECTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
];
const NONE: SlaState = { kind: 'none', label: '—', tone: 'neutral' };

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
  if (!deliveredAt)
    return { kind: 'none', label: 'Delivered', tone: 'neutral' };
  const msLate = new Date(deliveredAt).getTime() - new Date(dueAt).getTime();
  if (msLate <= 0)
    return { kind: 'onTime', label: 'On time', tone: 'positive' };
  return {
    kind: 'deliveredLate',
    label: `Late by ${span(Math.ceil(msLate / MINUTE_MS), Math.ceil)}`,
    tone: 'mutedCritical',
  };
}

function openVerdict(dueAt: string, createdAt: string, now: Date): SlaState {
  const due = new Date(dueAt).getTime();
  const msLeft = due - now.getTime();
  if (msLeft < 0) {
    const late = span(Math.ceil(-msLeft / MINUTE_MS), Math.ceil);
    return { kind: 'late', label: `Late ${late}`, tone: 'critical' };
  }

  const left = span(Math.floor(msLeft / MINUTE_MS), Math.floor);
  const slaWindow = due - new Date(createdAt).getTime();
  if (msLeft <= Math.max(DUE_SOON_SHARE * slaWindow, DUE_SOON_MIN_MS)) {
    return { kind: 'dueSoon', label: `Due in ${left}`, tone: 'caution' };
  }
  const when =
    msLeft < WEEKDAY_SHOWN_BELOW_MS
      ? formatWeekdayTime(dueAt)
      : formatMonthDay(dueAt);
  return {
    kind: 'onTrack',
    label: `Due ${when}`,
    tone: 'neutral',
    title: `in ${left}`,
  };
}

export function slaState({
  dueAt,
  deliveredAt,
  createdAt,
  status,
  now = new Date(),
}: {
  dueAt: string | null | undefined;
  deliveredAt?: string | null;
  createdAt: string;
  status: ShipmentStatus;
  now?: Date;
}): SlaState {
  if (status === 'FAILED_DELIVERY')
    return { kind: 'failed', label: 'Failed', tone: 'critical' };
  if (status === 'RETURNED')
    return { kind: 'failed', label: 'Returned', tone: 'critical' };
  if (!dueAt) return NONE;
  if (status === 'DELIVERED') return deliveredVerdict(dueAt, deliveredAt);
  if (!OPEN.includes(status)) return NONE;
  return openVerdict(dueAt, createdAt, now);
}
